export const SET_NAME = 'SET_NAME';
export const SET_TYPE = 'SET_TYPE';
export const SET_ATTRIBUTE = 'SET_ATTRIBUTE';
export const SET_TEXT = 'SET_TEXT';
export const PARSE_COMPLETE = 'PARSE_COMPLETE';
export const REGENERATE_SPRITE = 'REGENERATE_SPRITE';
export const ADD_TO_COLLECTION = 'ADD_TO_COLLECTION';

export function setName(name) {
  return {
    type: SET_NAME,
    payload: {
      name: name
    }
  };
}

export function setType(type) {
  return {
    type: SET_TYPE,
    payload: {
      type: type
    }
  };
}

export function setAttribute(attr, value) {
  return {
    type: SET_ATTRIBUTE,
    payload: {
      attr: attr,
      value: value
    }
  };
}

export function setText(sentences) {
  return {
    type: SET_TEXT,
    payload: {
      sentences: sentences
    }
  };
}

export function parseComplete(idx, sentence, result) {
  return {
    type: PARSE_COMPLETE,
    payload: {
      idx: idx,
      sentence: sentence,
      result: result
    }
  };
}

export function regenerateSprite() {
  return {
    type: REGENERATE_SPRITE
  };
}

// Note: This actions is consumed by the cardCreator, collection, AND game reducers!
export function addToCollection(props) {
  return {
    type: ADD_TO_COLLECTION,
    payload: props
  };
}
