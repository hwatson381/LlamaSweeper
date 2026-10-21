//! Offline analysis hook: shows each layer's pruned states to a callback. Only built with the
//! `analysis` feature, so the normal solver never pays for it.

use super::model::ChordModel;
use super::table::{ConnectivityPool, StateTable};
use std::cell::RefCell;

/// Everything about one layer after pruning. Bits are indexes into the factor bitsets
/// (mine factors first, then 3BV factors).
pub struct LayerView<'a> {
    pub layer: usize,
    pub layers: usize,
    pub states_before_pruning: usize,
    pub table: &'a StateTable,
    pub pool: &'a ConnectivityPool,
    pub model: &'a ChordModel,
    pub mine_factor_mask: &'a [u64],
    pub bbbv_factor_mask: &'a [u64],
    pub active_factors: &'a [u64],
    pub candidate_words: usize,
}

type Hook = Box<dyn FnMut(&LayerView)>;

thread_local! {
    static HOOK: RefCell<Option<Hook>> = RefCell::new(None);
}

pub fn set_layer_hook(hook: impl FnMut(&LayerView) + 'static) {
    HOOK.with(|slot| *slot.borrow_mut() = Some(Box::new(hook)));
}

pub fn clear_layer_hook() {
    HOOK.with(|slot| *slot.borrow_mut() = None);
}

pub(super) fn layer_done(view: &LayerView) {
    HOOK.with(|slot| {
        if let Some(hook) = slot.borrow_mut().as_mut() {
            hook(view);
        }
    });
}
