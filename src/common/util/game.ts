import {
  chain as _, compact, filter, findKey, flatMap,
  intersection, isArray, isString, mapValues, some, times, uniqBy
} from 'lodash';

import * as w from '../types';
import * as g from '../guards';
import {
  DEFAULT_GAME_FORMAT, MAX_HAND_SIZE, BLUE_PLACEMENT_HEXES, ORANGE_PLACEMENT_HEXES,
  TYPE_ROBOT, TYPE_STRUCTURE, TYPE_CORE, stringToType
} from '../constants';
import { arbitraryPlayerState } from '../store/defaultGameState';
import { GameFormat, SharedDeckGameFormat } from '../store/gameFormats';
import buildVocabulary from '../vocabulary/vocabulary';
import GridGenerator from '../components/hexgrid/GridGenerator';
import Hex from '../components/hexgrid/Hex';
import HexUtils from '../components/hexgrid/HexUtils';

import { clamp } from './common';

//
// I. Queries for game state.
//

export function opponent(playerName: w.PlayerColor): w.PlayerColor {
  return (playerName === 'blue') ? 'orange' : 'blue';
}

export function opponentName(state: w.GameState): w.PlayerColor {
  return opponent(state.currentTurn);
}

export function activePlayer(state: w.GameState): w.PlayerInGameState {
  return state.players[state.player];
}

export function currentPlayer(state: w.GameState): w.PlayerInGameState {
  return state.players[state.currentTurn];
}

export function opponentPlayer(state: w.GameState): w.PlayerInGameState {
  return state.players[opponentName(state)];
}

export function currentTutorialStep(state: w.GameState): w.TutorialStep | undefined {
  if ((state.tutorial || state.sandbox) && state.tutorialSteps) {
    const idx = state.tutorialCurrentStepIdx || 0;
    const step = state.tutorialSteps[idx];
    return Object.assign({}, step, {
      idx,
      numSteps: state.tutorialSteps.length
    });
  }
}

export function allObjectsOnBoard(state: w.GameState): { [hexId: string]: w.Object } {
  return Object.assign({}, state.players.blue.robotsOnBoard, state.players.orange.robotsOnBoard);
}

export function ownerOf(state: w.GameState, object: w.Object): w.PlayerInGameState | undefined {
  if (some(state.players.blue.robotsOnBoard, ['id', object.id])) {
    return state.players.blue;
  } else if (some(state.players.orange.robotsOnBoard, ['id', object.id])) {
    return state.players.orange;
  }
}

export function getAttribute(object: w.Object, attr: w.Attribute): number | undefined {
  if (object.temporaryStatAdjustments && object.temporaryStatAdjustments[attr]) {
    // Apply all temporary adjustments, one at a time, in order.
    return (object.temporaryStatAdjustments[attr] as w.StatAdjustment[])
      .reduce((val: number | undefined, adj: { func: string }) =>
        clamp(eval(adj.func) as (x: number) => number)(val), object.stats[attr]  // tslint:disable-line:no-eval
      );
  } else {
    return (object.stats[attr] === undefined) ? undefined : object.stats[attr];
  }
}

export function getCost(card: w.CardInGame): number {
  if (card.temporaryStatAdjustments && card.temporaryStatAdjustments.cost) {
    // Apply all temporary adjustments, one at a time, in order.
    return card.temporaryStatAdjustments.cost.reduce((val: number, adj: { func: string }) =>
      clamp(eval(adj.func) as (x: number) => number)(val), card.cost  // tslint:disable-line:no-eval
    );
  } else {
    return card.cost;
  }
}

function movesLeft(robot: w.Robot): number {
  return robot.cantMove ? 0 : (getAttribute(robot, 'speed') as number) - robot.movesMade;
}

export function hasEffect(object: w.Object, effect: string): boolean {
  return some((object.effects || []), ['effect', effect]);
}

function getEffect(object: w.Object, effect: string): any {
  return (object.effects || Array<w.Effect>())
            .filter((eff: w.Effect) => eff.effect === effect)
            .map((eff: w.Effect) => eff.props);
}

function allowedToAttack(state: w.GameState, attacker: w.Robot, targetHex: Hex): boolean {
  const defender: w.Object = allObjectsOnBoard(state)[HexUtils.getID(targetHex)];

  if (!defender ||
      (ownerOf(state, defender) as w.PlayerInGameState).name === (ownerOf(state, attacker) as w.PlayerInGameState).name ||
      attacker.card.type !== TYPE_ROBOT ||
      attacker.cantAttack ||
      hasEffect(attacker, 'cannotattack') ||
      (getAttribute(attacker, 'attack') as number) <= 0) {
    return false;
  } else if (hasEffect(attacker, 'canonlyattack')) {
    const validTargetIds = flatMap(getEffect(attacker, 'canonlyattack'), (e) => e.target.entries.map((t: w.Object) => t.id));
    return validTargetIds.includes(defender.id);
  } else {
    return true;
  }
}

export function matchesType(objectOrCard: w.Object | w.CardInGame, cardTypeQuery: string | string[]): boolean {
  const card: w.CardInGame = ('card' in objectOrCard) ? objectOrCard.card : objectOrCard;
  const cardType = card.type;
  if (isArray(cardTypeQuery)) {
    return cardTypeQuery.map(stringToType).includes(cardType);
  } else if (['anycard', 'allobjects'].includes(cardTypeQuery)) {
    return true;
  } else {
    return stringToType(cardTypeQuery) === cardType;
  }
}

export function checkVictoryConditions(state: w.GameState): w.GameState {
  if (!some(state.players.blue.robotsOnBoard, {card: {type: TYPE_CORE}})) {
    state.winner = 'orange';
  } else if (!some(state.players.orange.robotsOnBoard, {card: {type: TYPE_CORE}})) {
    state.winner = 'blue';
  }

  if (state.winner) {
    state = triggerSound(state, state.winner === state.player ? 'win.wav' : 'lose.wav');
    state = logAction(state, state.players[state.winner as w.PlayerColor], state.winner === state.player ? ' win' : 'wins');
  }

  return state;
}

// Given a target that may be a card, object, or hex, return the appropriate card if possible.
function determineTargetCard(state: w.GameState, target: w.Targetable | null): w.CardInGame | null {
  if (!target || g.isPlayerState(target)) {
    return null;
  } else {
    const targetObj = (isString(target) ? allObjectsOnBoard(state)[target] : target);
    return g.isObject(targetObj) ? targetObj.card : targetObj;
  }
}

//
// II. Grid-related helper functions.
//

export function allHexIds(): w.HexId[] {
  return GridGenerator.hexagon(3).map(HexUtils.getID);
}

export function getHex(state: w.GameState, object: w.Object): w.HexId | undefined {
  return findKey(allObjectsOnBoard(state), ['id', object.id]);
}

export function getAdjacentHexes(hex: Hex): Hex[] {
  return [
    new Hex(hex.q, hex.r - 1, hex.s + 1),
    new Hex(hex.q, hex.r + 1, hex.s - 1),
    new Hex(hex.q - 1, hex.r + 1, hex.s),
    new Hex(hex.q + 1, hex.r - 1, hex.s),
    new Hex(hex.q - 1, hex.r, hex.s + 1),
    new Hex(hex.q + 1, hex.r, hex.s - 1)
  ].filter((adjacentHex) =>
    // Filter out hexes that are not on the 3-radius hex grid.
    allHexIds().includes(HexUtils.getID(adjacentHex))
  );
}

export function validPlacementHexes(state: w.GameState, playerName: w.PlayerColor, type: w.CardType): Hex[] {
  let hexes = Array<Hex>();
  if (type === TYPE_ROBOT) {
    if (playerName === 'blue') {
      hexes = BLUE_PLACEMENT_HEXES.map(HexUtils.IDToHex);
    } else {
      hexes = ORANGE_PLACEMENT_HEXES.map(HexUtils.IDToHex);
    }
  } else if (type === TYPE_STRUCTURE) {
    const occupiedHexes = Object.keys(state.players[playerName].robotsOnBoard).map(HexUtils.IDToHex);
    hexes = flatMap(occupiedHexes, getAdjacentHexes);
  }

  return hexes.filter((hex) => !allObjectsOnBoard(state)[HexUtils.getID(hex)]);
}

export function validMovementHexes(state: w.GameState, startHex: Hex): Hex[] {
  const object: w.Robot = allObjectsOnBoard(state)[HexUtils.getID(startHex)] as w.Robot;

  let potentialMovementHexes = [startHex];

  times(movesLeft(object), () => {
    const newHexes = flatMap(potentialMovementHexes, getAdjacentHexes).filter((hex) =>
      hasEffect(object, 'canmoveoverobjects') || !Object.keys(allObjectsOnBoard(state)).includes(HexUtils.getID(hex))
    );

    potentialMovementHexes = uniqBy(potentialMovementHexes.concat(newHexes), HexUtils.getID);
  });

  return potentialMovementHexes.filter((hex) => !allObjectsOnBoard(state)[HexUtils.getID(hex)]);
}

export function validAttackHexes(state: w.GameState, startHex: Hex): Hex[] {
  const object: w.Robot = allObjectsOnBoard(state)[HexUtils.getID(startHex)] as w.Robot;
  const validMoveHexes = [startHex].concat(validMovementHexes(state, startHex));
  const potentialAttackHexes = _(validMoveHexes).flatMap(getAdjacentHexes).uniqBy(HexUtils.getID).value();

  return potentialAttackHexes.filter((hex) => allowedToAttack(state, object, hex));
}

export function validActionHexes(state: w.GameState, startHex: Hex): Hex[] {
  const object = allObjectsOnBoard(state)[HexUtils.getID(startHex)];
  if (object) {
    const movementHexes = validMovementHexes(state, startHex);
    const attackHexes = validAttackHexes(state, startHex);
    const activateHexes = ((object.activatedAbilities || []).length > 0 && !object.cantActivate) ? [startHex] : [];

    return Array<Hex>().concat(movementHexes, attackHexes, activateHexes);
  } else {
    return [];
  }
}

export function intermediateMoveHexId(state: w.GameState, startHex: Hex, attackHex: Hex): w.HexId | null {
  if (getAdjacentHexes(startHex).map(HexUtils.getID).includes(HexUtils.getID(attackHex))) {
    return null;
  } else {
    const adjacentHexIds = getAdjacentHexes(attackHex).map(HexUtils.getID);
    const movementHexIds = validMovementHexes(state, startHex).map(HexUtils.getID);
    return intersection(movementHexIds, adjacentHexIds)[0];
  }
}

//
// III. Effects on game state that are performed in many different places.
//

export function triggerSound(state: w.GameState, filename: string): w.GameState {
  state.sfxQueue = [...state.sfxQueue, filename];
  return state;
}

export function logAction(
  state: w.GameState,
  player: w.PlayerInGameState | null,
  action: string,
  cards: Record<string, w.CardInGame> = {},
  timestamp: number | null = null,
  target: w.Targetable | null = null
): w.GameState {
  const playerStr = player ?
    (player.name === state.player ?
      'You ' :
      `${(state.usernames as w.PerPlayer<string>)[player.name]} `) :
    '';

  target = determineTargetCard(state, target);
  const targetStr = target ? `, targeting |${target.name}|` : '';
  const targetCards = target ? {[target.name]: target} : {};

  const message = {
    id: state.actionId!,
    user: '[Game]',
    text: `${playerStr}${action}${targetStr}.`,
    timestamp: timestamp || Date.now(),
    cards: Object.assign({}, cards, targetCards)
  };

  state.actionLog.push(message);
  return state;
}

export function newGame(
  state: w.GameState,
  player: w.PlayerColor,
  usernames: w.PerPlayer<string>,
  decks: w.PerPlayer<w.PossiblyObfuscatedCard[]>,
  seed: string = '0',
  gameFormat = DEFAULT_GAME_FORMAT,
  gameOptions: w.GameOptions = {}
): w.GameState {
  const format: GameFormat = GameFormat.fromString(gameFormat);
  return format.startGame(state, player, usernames, decks, gameOptions, seed);
}

export function passTurn(state: w.GameState, player: w.PlayerColor): w.GameState {
  if (state.currentTurn === player) {
    return startTurn(endTurn(state));
  } else {
    return state;
  }
}

function startTurn(state: w.GameState): w.GameState {
  const player = currentPlayer(state);
  player.selectedCard = null;
  player.energy.total = Math.min(player.energy.total + 1, 10);
  player.energy.available = player.energy.total;
  player.robotsOnBoard = mapValues(player.robotsOnBoard, ((obj: w.Object) => {
    return Object.assign({}, obj, {
      movesMade: 0,
      cantActivate: false,
      cantAttack: false,
      cantMove: false,
      attackedThisTurn: false,
      movedThisTurn: false,
      attackedLastTurn: (obj as w.Robot).attackedThisTurn,
      movedLastTurn: (obj as w.Robot).movedThisTurn
    });
  }));

  state = drawCards(state, player, 1);
  state = triggerEvent(state, 'beginningOfTurn', {player: true});
  if (player.name === state.player) {
    state = triggerSound(state, 'yourmove.wav');
  }

  return state;
}

function endTurn(state: w.GameState): w.GameState {
  function decrementDuration(ability: w.PassiveAbility | w.TriggeredAbility): w.PassiveAbility | w.TriggeredAbility | null {
    const duration: number | undefined = ability.duration;
    if (duration) {
      if (duration === 1) {
        // Time's up: Unapply the ability and remove it.
        if (g.isPassiveAbility(ability)) {
          const targets: w.Targetable[] = ability.currentTargets!.entries;
          targets.forEach(ability.unapply);
        }
        return null;
      } else {
        return Object.assign({}, ability, {duration: duration ? duration - 1 : null});
      }
    } else {
      return ability;
    }
  }

  const previousTurnPlayer = currentPlayer(state);
  previousTurnPlayer.selectedCard = null;
  previousTurnPlayer.selectedTile = null;
  previousTurnPlayer.status.message = '';
  previousTurnPlayer.target = {choosing: false, chosen: null, possibleHexes: [], possibleCards: []};
  previousTurnPlayer.robotsOnBoard = mapValues(previousTurnPlayer.robotsOnBoard, ((obj) =>
    Object.assign({}, obj, {
      attackedThisTurn: false,
      movedThisTurn: false,
      attackedLastTurn: ('attackedThisTurn' in obj) ? obj.attackedThisTurn : undefined,
      movedLastTurn: ('movedThisTurn' in obj) ? obj.movedThisTurn : undefined,

      abilities: obj.abilities ? compact(obj.abilities.map(decrementDuration)) : undefined,
      triggers: obj.triggers ? compact(obj.triggers.map(decrementDuration)) : undefined
    })
  ));

  const nextTurnPlayer = opponentPlayer(state);
  nextTurnPlayer.robotsOnBoard = mapValues(nextTurnPlayer.robotsOnBoard, ((obj) =>
    Object.assign({}, obj, {
      abilities: compact((obj.abilities || Array<w.Ability>()).map(decrementDuration)),
      triggers: compact((obj.triggers || Array<w.Ability>()).map(decrementDuration))
    })
  ));

  state = triggerEvent(state, 'endOfTurn', {player: true});
  state = checkVictoryConditions(state);
  state.currentTurn = opponentName(state);

  return state;
}

export function drawCards(state: w.GameState, player: w.PlayerInGameState, count: number): w.GameState {
  const otherPlayer = state.players[opponent(player.name)];
  // Allow 1 extra card if an event is played (because that card will be discarded).
  const maxHandSize = MAX_HAND_SIZE + (state.eventExecuting ? 1 : 0);

  const numCardsDrawn = Math.min(count, maxHandSize - player.hand.length);
  const numCardsDiscarded = count - numCardsDrawn;

  if (numCardsDrawn > 0) {
    player.hand = player.hand.concat(player.deck.splice(0, numCardsDrawn));
    if (SharedDeckGameFormat.isActive(state)) {
      // In sharedDeck mode, drawing a card (or discarding the top card of the deck)
      // affects both players' decks.
      otherPlayer.deck.splice(0, numCardsDrawn);
    }
  }

  times(numCardsDiscarded, () => {
    const card = player.deck[0];
    if (card) {
      player.deck.splice(0, 1);
      if (SharedDeckGameFormat.isActive(state)) {
        otherPlayer.deck.splice(0, 1);
      }
      player.discardPile = player.discardPile.concat([card]);
      state = logAction(state, player, `had to discard a card due to having a full hand of ${MAX_HAND_SIZE} cards`);
    }
  });

  state = applyAbilities(state);
  return state;
}

// Note: This is used to either play or discard a set of cards.
export function discardCards(state: w.GameState, color: w.PlayerColor, cards: w.CardInGame[]): w.GameState {
  // At the moment, only the currently active player can ever play or discard a card.
  const player = state.players[color];
  player.discardPile = player.discardPile.concat(cards);
  removeCardsFromHand(state, cards);
  return state;
}

export function removeCardsFromHand(state: w.GameState, cards: w.CardInGame[]): w.GameState {
  // At the moment, only the currently active player can ever play or discard a card.
  const player = currentPlayer(state);
  const cardIds = cards.map((c) => c.id);
  player.hand = filter(player.hand, (c) => !cardIds.includes(c.id));
  return state;
}

export function dealDamageToObjectAtHex(state: w.GameState, amount: number, hex: w.HexId, cause: w.Cause | null = null): w.GameState {
  const object = allObjectsOnBoard(state)[hex];

  if (!object.beingDestroyed) {
    object.stats.health -= amount;
    state = logAction(state, null, `|${object.card.name}| received ${amount} damage`, {[object.card.name]: object.card});
    state = triggerEvent(state, 'afterDamageReceived', {object});
  }

  return updateOrDeleteObjectAtHex(state, object, hex, cause);
}

export function updateOrDeleteObjectAtHex(state: w.GameState, object: w.Object, hex: w.HexId, cause: w.Cause | null = null): w.GameState {
  const ownerName = (ownerOf(state, object) as w.PlayerInGameState).name;
  if ((getAttribute(object, 'health') as number) > 0 && !object.isDestroyed) {
    state.players[ownerName].robotsOnBoard[hex] = object;
  } else if (!object.beingDestroyed) {
    object.beingDestroyed = true;

    state = triggerSound(state, 'destroyed.wav');
    state = logAction(state, null, `|${object.card.name}| was destroyed`, {[object.card.name]: object.card});
    state = triggerEvent(state, 'afterDestroyed', {object, condition: ((t: w.Trigger) => (t.cause === cause || t.cause === 'anyevent'))});

    // Check if the object is still there, because the afterDestroyed trigger may have,
    // e.g., returned it to its owner's hand.
    if (allObjectsOnBoard(state)[hex]) {
      const card = state.players[ownerName].robotsOnBoard[hex].card;
      state = removeObjectFromBoard(state, object, hex);
      state = discardCards(state, state.players[ownerName].name, [card]);
    }
  }

  state = applyAbilities(state);

  return state;
}

export function removeObjectFromBoard(state: w.GameState, object: w.Object, hex: w.HexId): w.GameState {
  const ownerName: w.PlayerColor = (ownerOf(state, object) as w.PlayerInGameState).name;

  delete state.players[ownerName].robotsOnBoard[hex];

  // Unapply any abilities that this object had.
  (object.abilities || Array<w.Ability>())
    .filter((ability) => ability.currentTargets)
    .forEach((ability) => {
      const targets: w.Targetable[] = ability.currentTargets!.entries;
      targets.forEach(ability.unapply);
    });

  state = applyAbilities(state);
  state = checkVictoryConditions(state);
  return state;
}

export function setTargetAndExecuteQueuedAction(state: w.GameState, target: w.CardInGame | w.HexId): w.GameState {
  const player: w.PlayerInGameState = currentPlayer(state);
  const targets: Array<w.CardInGame | w.HexId> = (player.target.chosen || []).concat([target]);

  // Select target tile for event or afterPlayed trigger.
  player.target = {
    chosen: targets,
    choosing: false,
    possibleHexes: [],
    possibleCards: []
  };

  // Perform the trigger (in a temp state because we may need more targets yet).
  const tempState: w.GameState = state.callbackAfterTargetSelected!(state);

  if (tempState.players[player.name].target.choosing) {
    // Still need more targets!
    // So we revert to old state but use new target selection properties.
    state.players[player.name].target = Object.assign({}, tempState.players[player.name].target, {chosen: targets});

    return state;
  } else {
    // We have all the targets we need and we're good to go.
    // Reset target and return new state.
    tempState.callbackAfterTargetSelected = undefined;
    tempState.players[player.name].target = arbitraryPlayerState().target;
    tempState.players[player.name].status.message = '';

    return tempState;
  }
}

//
// IV. Card behavior: actions, triggers, passive abilities.
//

export function executeCmd(
  state: w.GameState,
  cmd: ((state: w.GameState) => any) | w.StringRepresentationOf<(state: w.GameState) => any>,
  currentObject: w.Object | null = null,
  source: w.AbilityId | null = null
): w.GameState | w.Target {
  type BuildVocabulary = (state: w.GameState, currentObject: w.Object | null, source: w.AbilityId | null) => any;
  const vocabulary = (buildVocabulary as BuildVocabulary)(state, currentObject, source);
  const [terms, definitions] = [Object.keys(vocabulary), Object.values(vocabulary)];

  const wrappedCmd = `(function (${terms.join(',')}) { return (${cmd})(); })`;
  return eval(wrappedCmd)(...definitions);  // tslint:disable-line:no-eval
}

export function triggerEvent(
  state: w.GameState,
  triggerType: string,
  target: w.EventTarget,
  defaultBehavior: null | ((state: w.GameState) => w.GameState) = null
): w.GameState {
  // Formulate the trigger condition.
  const defaultCondition = ((t: w.Trigger) => (target.condition ? target.condition(t) : true));
  let condition: ((t: w.Trigger) => boolean) = defaultCondition;

  if (target.object) {
    state = Object.assign({}, state, {it: target.object});
    condition = ((t: w.Trigger) =>
      (t.targets as w.Object[]).map((o: w.Object) => o.id).includes(target.object!.id) && defaultCondition(t)
    );
  } else if (target.player) {
    state = Object.assign({}, state, {itP: currentPlayer(state)});
    condition = ((t: w.Trigger) =>
      (t.targets as w.PlayerInGameState[]).map((p: w.PlayerInGameState) => p.name).includes(state.currentTurn) && defaultCondition(t)
    );
  }
  if (target.undergoer) {
    // Also store the undergoer (as opposed to agent) of the event if present.
    // (see https://en.wikipedia.org/wiki/Patient_(grammar) )
    state = {...state, that: target.undergoer};
  }

  // Look up any relevant triggers for this condition.
  const triggers = flatMap(Object.values(allObjectsOnBoard(state)), ((object: w.Object) =>
    (object.triggers || Array<w.TriggeredAbility>())
      .map((t: w.TriggeredAbility) => {
        // Assign t.trigger.targets (used in testing the condition) and t.object (used in executing the action).
        t.trigger.targets = (executeCmd(state, t.trigger.targetFunc, object) as w.Target).entries;
        return Object.assign({}, t, {object});
      })
      .filter((t) => t.trigger.type === triggerType && condition(t.trigger))
  ));

  // Execute the defaultBehavior of the event (if any), unless any of the triggers overrides it.
  // Note: At the moment, only afterAttack events can be overridden.
  if (defaultBehavior && !some(triggers, 'override')) {
    state = defaultBehavior(state);
  }

  // Now execute each trigger.
  triggers.forEach((t: w.TriggeredAbility & { object: w.Object }) => {
    // Ordinarily, currentObject has higher salience than state.it
    //     (see it() in vocabulary/targets.js)
    // but we actually want the opposite behavior when processing a trigger!
    // For example, when the trigger is:
    //     Arena: Whenever a robot is destroyed in combat, deal 1 damage to its controller.
    //         state.it = (destroyed robot)
    //         t.object = Arena
    //         "its controller" should = (destroyed robot)
    const it: w.Object | null = (state.it && g.isObject(state.it) ? (state.it as w.Object) : null);
    const currentObject: w.Object = it || t.object;
    executeCmd(state, t.action, currentObject);
  });

  return Object.assign({}, state, {it: null, itP: null, that: null});
}

export function applyAbilities(state: w.GameState): w.GameState {
  Object.values(allObjectsOnBoard(state)).forEach((obj) => {
    const abilities: w.PassiveAbility[] = obj.abilities || Array<w.PassiveAbility>();

    abilities.forEach((ability) => {
      // Unapply this ability for all previously targeted objects.
      if (ability.currentTargets) {
        const targets: w.Targetable[] = ability.currentTargets.entries;
        targets.forEach(ability.unapply);
      }

      if (!ability.disabled) {
        // Apply this ability to all targeted objects.
        // console.log(`Applying ability of ${obj.card.name} to ${ability.targets}`);
        ability.currentTargets = executeCmd(state, ability.targets, obj) as w.Target;
        const targets: w.Targetable[] = ability.currentTargets.entries;
        targets.forEach(ability.apply);
      }
    });

    obj.abilities = abilities.filter((ability) => !ability.disabled);
  });

  return state;
}

export function reversedCmd(cmd: string): string {
  return cmd.replace(/setAbility/g, 'unsetAbility')
            .replace(/setTrigger/g, 'unsetTrigger');
}
