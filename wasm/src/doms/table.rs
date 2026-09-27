//! Storage for one layer of DP states.
//!
//! A state is `(connectivity id, factor hits)` and stores the cheapest cost found for it plus the
//! set of candidates chorded to get there. Bitset widths are fixed for a whole solve, so states
//! live in flat fixed-stride arrays rather than as individually allocated bitsets.

use rustc_hash::FxHashMap;

/// SplitMix64-style mixing, matching the reference implementation.
pub fn hash_combine(seed: u64, mut value: u64) -> u64 {
    value ^= value >> 30;
    value = value.wrapping_mul(0xbf58476d1ce4e5b9);
    value ^= value >> 27;
    value = value.wrapping_mul(0x94d049bb133111eb);
    value ^= value >> 31;
    seed ^ value
        .wrapping_add(0x9e3779b97f4a7c15)
        .wrapping_add(seed << 6)
        .wrapping_add(seed >> 2)
}

pub fn set_bit(bits: &mut [u64], position: usize) {
    bits[position / 64] |= 1u64 << (position % 64);
}

pub fn test_bit(bits: &[u64], position: usize) -> bool {
    (bits[position / 64] >> (position % 64)) & 1 == 1
}

/// Interns connectivity signatures so each state only stores a `u32` id.
///
/// A signature has one bitset per unfinished chain: the undecided candidates that chain can
/// still reveal. The bitsets are sorted and concatenated so equal chain sets compare equal.
/// Id 0 is always the empty signature (no unfinished chains).
pub struct ConnectivityPool {
    ids: FxHashMap<Vec<u64>, u32>,
    by_id: Vec<Vec<u64>>,
}

impl ConnectivityPool {
    pub fn with_capacity(capacity: usize) -> Self {
        let mut pool = ConnectivityPool {
            ids: FxHashMap::with_capacity_and_hasher(capacity, Default::default()),
            by_id: Vec::with_capacity(capacity),
        };
        pool.intern(&[]);
        pool
    }

    pub fn intern(&mut self, signature: &[u64]) -> u32 {
        if let Some(&id) = self.ids.get(signature) {
            return id;
        }
        let id = self.by_id.len() as u32;
        self.by_id.push(signature.to_vec());
        self.ids.insert(signature.to_vec(), id);
        id
    }

    pub fn get(&self, id: u32) -> &[u64] {
        &self.by_id[id as usize]
    }

    pub fn len(&self) -> usize {
        self.by_id.len()
    }
}

const EMPTY: u32 = u32::MAX;

/// Open-addressed hash table of `(connectivity id, factor hits) -> (cost, chords)`.
/// States are only inserted before pruning and only erased during it, so erasing just marks the
/// entry dead and probing skips over it.
pub struct StateTable {
    factor_words: usize,
    candidate_words: usize,
    connectivity_ids: Vec<u32>,
    costs: Vec<i32>,
    factor_hits: Vec<u64>,
    chords: Vec<u64>,
    alive: Vec<bool>,
    slots: Vec<u32>,
    used_slots: usize,
    live: usize,
}

impl StateTable {
    pub fn new(factor_words: usize, candidate_words: usize) -> Self {
        StateTable {
            factor_words,
            candidate_words,
            connectivity_ids: Vec::new(),
            costs: Vec::new(),
            factor_hits: Vec::new(),
            chords: Vec::new(),
            alive: Vec::new(),
            slots: Vec::new(),
            used_slots: 0,
            live: 0,
        }
    }

    /// Number of live states.
    pub fn len(&self) -> usize {
        self.live
    }

    /// Number of entries including dead ones; valid indexes are `0..entry_count()`.
    pub fn entry_count(&self) -> usize {
        self.connectivity_ids.len()
    }

    pub fn is_alive(&self, entry: usize) -> bool {
        self.alive[entry]
    }

    pub fn connectivity_id(&self, entry: usize) -> u32 {
        self.connectivity_ids[entry]
    }

    pub fn cost(&self, entry: usize) -> i32 {
        self.costs[entry]
    }

    pub fn set_cost(&mut self, entry: usize, cost: i32) {
        self.costs[entry] = cost;
    }

    pub fn factor_hits(&self, entry: usize) -> &[u64] {
        &self.factor_hits[entry * self.factor_words..(entry + 1) * self.factor_words]
    }

    /// Bitset of the candidates chorded so far.
    pub fn chords(&self, entry: usize) -> &[u64] {
        &self.chords[entry * self.candidate_words..(entry + 1) * self.candidate_words]
    }

    pub fn chords_mut(&mut self, entry: usize) -> &mut [u64] {
        &mut self.chords[entry * self.candidate_words..(entry + 1) * self.candidate_words]
    }

    pub fn reserve(&mut self, count: usize) {
        self.connectivity_ids.reserve(count);
        self.costs.reserve(count);
        self.alive.reserve(count);
        self.factor_hits.reserve(count.saturating_mul(self.factor_words));
        self.chords.reserve(count.saturating_mul(self.candidate_words));
        let mut capacity = 8usize;
        while capacity - capacity / 4 < count {
            capacity *= 2;
        }
        if capacity > self.slots.len() {
            self.rehash(capacity);
        }
    }

    fn hash(connectivity_id: u32, factor_hits: &[u64]) -> usize {
        let mut hash = hash_combine(0, connectivity_id as u64);
        for &word in factor_hits {
            hash = hash_combine(hash, word);
        }
        hash as usize
    }

    pub fn find(&self, connectivity_id: u32, factor_hits: &[u64]) -> Option<usize> {
        if self.slots.is_empty() {
            return None;
        }
        let mask = self.slots.len() - 1;
        let mut slot = Self::hash(connectivity_id, factor_hits) & mask;
        loop {
            let entry = self.slots[slot];
            if entry == EMPTY {
                return None;
            }
            let entry = entry as usize;
            if self.alive[entry]
                && self.connectivity_ids[entry] == connectivity_id
                && self.factor_hits(entry) == factor_hits
            {
                return Some(entry);
            }
            slot = (slot + 1) & mask;
        }
    }

    /// Callers must check `find` first; duplicates are not detected here.
    pub fn insert(&mut self, connectivity_id: u32, factor_hits: &[u64], cost: i32, chords: &[u64]) -> usize {
        if self.slots.is_empty() {
            self.rehash(8);
        } else if (self.used_slots + 1) * 4 > self.slots.len() * 3 {
            self.rehash(self.slots.len() * 2);
        }
        let entry = self.connectivity_ids.len();
        self.connectivity_ids.push(connectivity_id);
        self.costs.push(cost);
        self.factor_hits.extend_from_slice(factor_hits);
        self.chords.extend_from_slice(chords);
        self.alive.push(true);

        let mask = self.slots.len() - 1;
        let mut slot = Self::hash(connectivity_id, factor_hits) & mask;
        while self.slots[slot] != EMPTY {
            slot = (slot + 1) & mask;
        }
        self.slots[slot] = entry as u32;
        self.used_slots += 1;
        self.live += 1;
        entry
    }

    pub fn erase(&mut self, entry: usize) {
        if self.alive[entry] {
            self.alive[entry] = false;
            self.live -= 1;
        }
    }

    fn rehash(&mut self, capacity: usize) {
        let mut slots = vec![EMPTY; capacity];
        let mask = capacity - 1;
        for entry in 0..self.connectivity_ids.len() {
            if !self.alive[entry] {
                continue;
            }
            let mut slot = Self::hash(self.connectivity_ids[entry], self.factor_hits(entry)) & mask;
            while slots[slot] != EMPTY {
                slot = (slot + 1) & mask;
            }
            slots[slot] = entry as u32;
        }
        self.slots = slots;
        self.used_slots = self.live;
    }
}
