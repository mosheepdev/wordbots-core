import { flatMap, has, some } from 'lodash';

import * as w from '../types';
import { allHexIds, getHex, getAttribute, getAdjacentHexes } from '../util/game';
import HU from '../components/hexgrid/HexUtils';

function objectHasProperty(obj: w.Object, property: string): boolean {
  switch (property) {
    // Simple properties.
    case 'attackedlastturn': return obj.attackedLastTurn || false;
    case 'attackedthisturn': return obj.attackedThisTurn || false;
    case 'movedlastturn': return obj.movedLastTurn || false;
    case 'movedthisturn': return obj.movedThisTurn || false;
    case 'isdestroyed': return obj.isDestroyed || false;

    // Complex properties.
    case 'isdamaged':
      return getAttribute(obj, 'health')! < obj.card.stats!.health;
  }

  throw new Error(`Unknown property ${property}!`);
}

// Object conditions return (hexId, obj) -> bool functions.
// They are used by the objectsMatchingConditions() collection.
type ObjectCondition = (hexId: w.HexId, obj: w.Object) => boolean;

export function objectConditions(state: w.GameState): Record<string, w.Returns<ObjectCondition>> {
  return {
    adjacentTo: (targets: w.ObjectCollection | w.HexCollection): ObjectCondition => {
      const targetHexIds: w.HexId[] = targets.type === 'objects' ? targets.entries.map((o) => getHex(state, o)!) : targets.entries;
      const neighborHexes: w.HexId[] = flatMap(targetHexIds, (h: w.HexId) => getAdjacentHexes(HU.IDToHex(h))).map(HU.getID);

      return ((hexId, _obj) => neighborHexes.includes(hexId));
    },

    attributeComparison: (attr: w.Attribute, comp: (attrValue: number) => boolean): ObjectCondition => {
      return ((_hexId, obj) => comp(getAttribute(obj, attr)!));
    },

    controlledBy: (players: w.PlayerCollection): ObjectCondition => {
      const player = players.entries[0]; // Unpack player target.
      return ((hexId, _obj) => has(player.robotsOnBoard, hexId));
    },

    exactDistanceFrom: (distance: number, targets: w.ObjectCollection | w.HexCollection): ObjectCondition => {
      const targetHexIds: w.HexId[] = targets.type === 'objects' ? targets.entries.map((o) => getHex(state, o)!) : targets.entries;
      const nearbyHexIds: w.HexId[] = allHexIds().filter((h1: w.HexId) =>
        some(targetHexIds, (h2: w.HexId) => HU.distance(HU.IDToHex(h1), HU.IDToHex(h2)) === distance)
      );

      return ((hexId, _obj) => nearbyHexIds.includes(hexId));
    },

    // Only used interally, not exposed by parser.
    hasId: (id: w.HexId): ObjectCondition => {
      return ((_hexId, obj) => obj.id === id);
    },

    hasProperty: (property: string): ObjectCondition => {
      return ((_hexId, obj) => objectHasProperty(obj, property));
    },

    unoccupied: (): ObjectCondition => {
      return ((_hexId, obj) => !obj);
    },

    withinDistanceOf: (distance: number, targets: w.ObjectCollection | w.HexCollection): ObjectCondition => {
      const targetHexIds: w.HexId[] = targets.type === 'objects' ? targets.entries.map((o) => getHex(state, o)!) : targets.entries;
      const nearbyHexIds: w.HexId[] = allHexIds().filter((h1: w.HexId) =>
        some(targetHexIds, (h2: w.HexId) => HU.distance(HU.IDToHex(h1), HU.IDToHex(h2)) <= distance)
      );

      return ((hexId, _obj) => nearbyHexIds.includes(hexId));
    }
  };
}

// Global conditions simply return a boolean.
// They're used in if-expressions.
export function globalConditions(_state: w.GameState): Record<string, w.Returns<boolean>> {
  return {
    collectionExists: (collection: w.Collection) => {
      return collection.entries.length > 0;
    },

    targetHasProperty: (target: w.ObjectCollection, property: string) => {
      return target.entries.every((obj) => objectHasProperty(obj, property));
    }
  };
}
