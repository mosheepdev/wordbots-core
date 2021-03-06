import * as w from '../types';
import { id } from '../util/common';
import { reversedCmd, executeCmd } from '../util/game';

export function setAbility(state: w.GameState, currentObject: w.Object | null, source: w.AbilityId | null): w.Returns<void> {
  return (ability) => {
    if (currentObject && (!source || !currentObject.abilities.find((a) => a.source === source))) {
      ability = Object.assign({}, ability, {
        source,
        duration: state.memory.duration || null
      });

      currentObject.abilities = currentObject.abilities.concat([ability]);
    }
  };
}

export function unsetAbility(_state: w.GameState, currentObject: w.Object | null, source: w.AbilityId | null): w.Returns<void> {
  return () => {
    if (currentObject) {
      currentObject.abilities = currentObject.abilities.map((ability) =>
        Object.assign({}, ability, {disabled: ability.source === source})
      );
    }
  };
}

// Abilities are functions that return an object the following properties:
//   aid => ('ability ID') unique identifier
//   targets => function that returns targets when called with executeCmd
//   apply => function that applies the ability to a valid target
//   unapply => function that "un-applies" the ability from a target that is no longer valid

export function abilities(state: w.GameState): Record<string, w.Returns<any>> {
  return {
    activated: (targetFunc: (state: w.GameState) => w.Target[], action) => {
      const aid: w.AbilityId = id();
      const cmdText: string = state.currentCmdText || '';

      return {
        aid,
        targets: `(${targetFunc.toString()})`,
        apply: (target: w.Object) => {
          target.activatedAbilities = (target.activatedAbilities || []);

          if (!target.activatedAbilities.find((a) => a.aid === aid)) {
            target.activatedAbilities = target.activatedAbilities.concat({
              aid,
              text: cmdText.replace('Activate: ', ''),
              cmd: action
            });
          }
        },
        unapply: (target: w.Object) => {
          target.activatedAbilities = (target.activatedAbilities || []).filter((a) => a.aid !== aid);
        }
      };
    },

    attributeAdjustment: (targetFunc: (state: w.GameState) => w.Target[], attr: w.Attribute | 'cost', func) => {
      const aid: w.AbilityId = id();
      return {
        aid,
        targets: `(${targetFunc.toString()})`,
        apply: (target: w.Object | w.CardInGame) => {
          if (!target.temporaryStatAdjustments) {
            target.temporaryStatAdjustments = { attack: [], health: [], speed: [], cost: [] };
          }

          target.temporaryStatAdjustments[attr] = target.temporaryStatAdjustments[attr]!.concat({
            aid,
            // Convert func to string so that we can serialize this temporaryStatAdjustment if necessary
            // (e.g. to reveal a card from the server).
            func: `(${func.toString()})`
          });
        },
        unapply: (target: w.Object | w.CardInGame) => {
          if (target.temporaryStatAdjustments && target.temporaryStatAdjustments[attr]) {
            target.temporaryStatAdjustments[attr] = target.temporaryStatAdjustments[attr]!.filter((adj) =>
              adj.aid !== aid
            );
          }
        }
      };
    },

    applyEffect: (targetFunc: (state: w.GameState) => w.Target[], effect: string, props = {}) => {
      const aid: w.AbilityId = id();
      return {
        aid,
        targets: `(${targetFunc.toString()})`,
        apply: (target: w.Object) => {
          if (!(target.effects || []).find((eff) => eff.aid === aid)) {
            target.effects = (target.effects || []).concat({
              aid,
              effect,
              props
            });
          }
        },
        unapply: (target: w.Object) => {
          target.effects = (target.effects || []).filter((eff) => eff.aid !== aid);
        }
      };
    },

    freezeAttribute: (_targetFunc: (state: w.GameState) => w.Target[], _attribute: w.Attribute) => {
      // TODO
      throw new Error('Not yet implemented!');
    },

    giveAbility: (targetFunc: (state: w.GameState) => w.Target[], cmd) => {
      const aid: w.AbilityId = id();
      return {
        aid,
        targets: `(${targetFunc.toString()})`,
        apply: (target: w.Object) => {
          executeCmd(state, cmd, target, aid);
        },
        unapply: (target: w.Object) => {
          executeCmd(state, reversedCmd(cmd), target, aid);
        }
      };
    }
  };
}
