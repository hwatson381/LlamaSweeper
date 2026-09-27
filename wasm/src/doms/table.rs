//! Storage for one layer of DP states.
//!
//! A state is `(connectivity id, factor hits)` and stores the cheapest cost found for it plus the
//! set of candidates chorded to get there. Bitset widths are fixed for a whole solve, so states
//! live in flat fixed-stride arrays rather than as individually allocated bitsets.

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

fn hash_words(seed: u64, words: &[u64]) -> usize {
    words.iter().fold(hash_combine(0, seed), |hash, &word| hash_combine(hash, word)) as usize
}

/// Smallest power-of-two slot count that keeps `count` entries under 3/4 load.
fn slot_capacity(count: usize) -> usize {
    let mut capacity = 8usize;
    while capacity - capacity / 4 < count {
        capacity *= 2;
    }
    capacity
}

pub fn set_bit(bits: &mut [u64], position: usize) {
    bits[position / 64] |= 1u64 << (position % 64);
}

pub fn test_bit(bits: &[u64], position: usize) -> bool {
    (bits[position / 64] >> (position % 64)) & 1 == 1
}

const EMPTY: u32 = u32::MAX;

/// Interns connectivity signatures so each state only stores a `u32` id.
///
/// A signature has one bitset per unfinished chain: the undecided candidates that chain can
/// still reveal. The bitsets are sorted and concatenated so equal chain sets compare equal.
/// Id 0 is always the empty signature (no unfinished chains).
pub struct ConnectivityPool {
    /// All signatures back to back; id `i` is `words[starts[i]..starts[i + 1]]`.
    words: Vec<u64>,
    starts: Vec<usize>,
    /// Open-addressed index of ids by signature.
    slots: Vec<u32>,
}

impl ConnectivityPool {
    pub fn with_capacity(capacity: usize) -> Self {
        let mut starts = Vec::with_capacity(capacity + 1);
        starts.push(0);
        let mut pool = ConnectivityPool {
            words: Vec::new(),
            starts,
            slots: vec![EMPTY; slot_capacity(capacity)],
        };
        pool.intern(&[]);
        pool
    }

    fn hash(signature: &[u64]) -> usize {
        hash_words(signature.len() as u64, signature)
    }

    pub fn intern(&mut self, signature: &[u64]) -> u32 {
        if (self.len() + 1) * 4 > self.slots.len() * 3 {
            self.rehash(self.slots.len() * 2);
        }
        let mask = self.slots.len() - 1;
        let mut slot = Self::hash(signature) & mask;
        loop {
            let id = self.slots[slot];
            if id == EMPTY {
                break;
            }
            if self.get(id) == signature {
                return id;
            }
            slot = (slot + 1) & mask;
        }
        let id = self.len() as u32;
        self.words.extend_from_slice(signature);
        self.starts.push(self.words.len());
        self.slots[slot] = id;
        id
    }

    pub fn get(&self, id: u32) -> &[u64] {
        &self.words[self.starts[id as usize]..self.starts[id as usize + 1]]
    }

    pub fn len(&self) -> usize {
        self.starts.len() - 1
    }

    fn rehash(&mut self, capacity: usize) {
        let mut slots = vec![EMPTY; capacity];
        let mask = capacity - 1;
        for id in 0..self.len() as u32 {
            let mut slot = Self::hash(self.get(id)) & mask;
            while slots[slot] != EMPTY {
                slot = (slot + 1) & mask;
            }
            slots[slot] = id;
        }
        self.slots = slots;
    }
}

pub enum Lookup {
    Found(usize),
    /// Slot to pass to `insert_vacant`.
    Vacant(usize),
}

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
        let capacity = slot_capacity(count);
        if capacity > self.slots.len() {
            self.rehash(capacity);
        }
    }

    fn hash(connectivity_id: u32, factor_hits: &[u64]) -> usize {
        hash_words(connectivity_id as u64, factor_hits)
    }

    fn matches(&self, entry: usize, connectivity_id: u32, factor_hits: &[u64]) -> bool {
        self.alive[entry] && self.connectivity_ids[entry] == connectivity_id && self.factor_hits(entry) == factor_hits
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
            if self.matches(entry as usize, connectivity_id, factor_hits) {
                return Some(entry as usize);
            }
            slot = (slot + 1) & mask;
        }
    }

    /// Like `find`, but grows the table first so a `Vacant` slot can be filled straight away.
    pub fn lookup(&mut self, connectivity_id: u32, factor_hits: &[u64]) -> Lookup {
        if self.slots.is_empty() {
            self.rehash(8);
        } else if (self.used_slots + 1) * 4 > self.slots.len() * 3 {
            self.rehash(self.slots.len() * 2);
        }
        let mask = self.slots.len() - 1;
        let mut slot = Self::hash(connectivity_id, factor_hits) & mask;
        loop {
            let entry = self.slots[slot];
            if entry == EMPTY {
                return Lookup::Vacant(slot);
            }
            if self.matches(entry as usize, connectivity_id, factor_hits) {
                return Lookup::Found(entry as usize);
            }
            slot = (slot + 1) & mask;
        }
    }

    /// `slot` must come from the immediately preceding `lookup` for this state.
    pub fn insert_vacant(&mut self, slot: usize, connectivity_id: u32, factor_hits: &[u64], cost: i32, chords: &[u64]) -> usize {
        let entry = self.connectivity_ids.len();
        self.connectivity_ids.push(connectivity_id);
        self.costs.push(cost);
        self.factor_hits.extend_from_slice(factor_hits);
        self.chords.extend_from_slice(chords);
        self.alive.push(true);
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
