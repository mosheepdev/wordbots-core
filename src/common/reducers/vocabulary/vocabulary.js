import actions from './actions';
import targets from './targets';
import conditions from './conditions';
import { allTiles, cardsInHand, objectsInPlay, objectsMatchingCondition } from './collections';
import { attributeSum, count } from './numbers';

const vocabulary = {
  actions: actions,
  targets: targets,
  conditions: conditions,

  // Global methods
  allTiles: allTiles,
  cardsInHand: cardsInHand,
  objectsInPlay: objectsInPlay,
  objectsMatchingCondition: objectsMatchingCondition,
  attributeSum: attributeSum,
  count: count
};

export default vocabulary;