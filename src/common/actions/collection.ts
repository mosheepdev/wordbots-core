import * as w from '../types';

export const DELETE_DECK = 'DELETE_DECK';
export const DUPLICATE_DECK = 'DUPLICATE_DECK';
export const EDIT_DECK = 'EDIT_DECK';
export const EXPORT_CARDS = 'EXPORT_CARDS';
export const IMPORT_CARDS = 'IMPORT_CARDS';
export const OPEN_CARD_FOR_EDITING = 'OPEN_CARD_FOR_EDITING';
export const REMOVE_FROM_COLLECTION = 'REMOVE_FROM_COLLECTION';
export const SAVE_DECK = 'SAVE_DECK';
export const SELECT_DECK = 'SELECT_DECK';
export const SELECT_FORMAT = 'SELECT_FORMAT';

export function deleteDeck(deckId: w.DeckId): w.Action {
  return {
    type: DELETE_DECK,
    payload: { deckId }
  };
}

export function duplicateDeck(deckId: w.DeckId): w.Action {
  return {
    type: DUPLICATE_DECK,
    payload: { deckId }
  };
}

export function editDeck(deckId: w.DeckId): w.Action {
  return {
    type: EDIT_DECK,
    payload: { deckId }
  };
}

export function exportCards(cards: w.CardInStore[]): w.Action {
  return {
    type: EXPORT_CARDS,
    payload: { cards }
  };
}

export function importCards(json: string): w.Action {
  return {
    type: IMPORT_CARDS,
    payload: { json }
  };
}

// Note: This action is consumed by the creator reducer!
export function openForEditing(card: w.CardInStore): w.Action {
  return {
    type: OPEN_CARD_FOR_EDITING,
    payload: { card }
  };
}

export function removeFromCollection(ids: w.CardId[]): w.Action {
  return {
    type: REMOVE_FROM_COLLECTION,
    payload: { ids }
  };
}

export function saveDeck(id: w.DeckId, name: string, cardIds: w.CardId[]): w.Action {
  return {
    type: SAVE_DECK,
    payload: { id, name, cardIds }
  };
}
