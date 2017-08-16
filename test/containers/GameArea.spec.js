import React from 'react';

import { getDefaultState, combineState } from '../testHelpers';
import { renderElement, getComponent, createGameArea } from '../reactHelpers';
import Card from '../../src/common/components/card/Card';
import CardViewer from '../../src/common/components/card/CardViewer';
import Board from '../../src/common/components/game/Board';
import EventAnimation from '../../src/common/components/game/EventAnimation';
import PlayerArea from '../../src/common/components/game/PlayerArea';
import Status from '../../src/common/components/game/Status';
import VictoryScreen from '../../src/common/components/game/VictoryScreen';
import HexGrid from '../../src/common/components/hexgrid/HexGrid';
import HexUtils from '../../src/common/components/hexgrid/HexUtils';
import * as actions from '../../src/common/actions/game';
import gameReducer from '../../src/common/reducers/game';

describe('GameArea container', () => {
  it('renders the default game state', () => {
    const state = combineState(getDefaultState());

    const game = createGameArea(state);
    const dom = renderElement(game);

    const paper = dom.props.children[1];
    const mainDiv = paper.props.children[2];
    const board = mainDiv.props.children[1];
    const victoryScreen = paper.props.children[5];

    /* eslint-disable react/jsx-key */
    expect(paper.props.children).toEqual([
      <PlayerArea opponent gameProps={game.props} />,
      <CardViewer hoveredCard={undefined} />,
      <div
        ref={mainDiv.ref}
        style={{
          position: 'absolute',
          left: 0, top: 75, bottom: 75, right: 0,
          margin: '0 auto',
          width: 1000,
          zIndex: 999
      }}>
        <Status
          player={'orange'}
          status={state.game.players.orange.status} />
        <Board
          selectedTile={null}
          target={state.game.players.orange.target}
          bluePieces={state.game.players.blue.robotsOnBoard}
          orangePieces={state.game.players.orange.robotsOnBoard}
          player={'orange'}
          currentTurn={'orange'}
          playingCardType={null}
          attack={null}
          size={1000}
          onSelectTile={board.props.onSelectTile}
          onHoverTile={board.props.onHoverTile}
          onTutorialStep={board.props.onTutorialStep}
          onEndGame={board.props.onEndGame}
          />
      </div>,
      <PlayerArea gameProps={game.props} />,
      <EventAnimation eventQueue={[]} currentTurn="orange" />,
      <VictoryScreen
        winnerColor={null}
        winnerName={null}
        onClick={victoryScreen.props.onClick} />
    ]);
  });
  /* eslint-enable react/jsx-key */

  it('should propagate events', () => {
    const dispatchedActions = [];
    const state = combineState(getDefaultState());

    function dispatch(action) {
      // console.log(action);
      dispatchedActions.push(action);
      state.game = gameReducer(state.game, action);
    }

    function clickCard(predicate) {
      getComponent('GameArea', Card, state, dispatch, predicate).props
        .onCardClick();
      return dispatchedActions.pop();
    }
    function clickHex(id) {
      getComponent('GameArea', HexGrid, state, dispatch).props
        .actions.onClick(HexUtils.IDToHex(id));
      return dispatchedActions.pop();
    }
    function hoverHex(id, type) {
      getComponent('GameArea', HexGrid, state, dispatch).props
        .actions.onHexHover(HexUtils.IDToHex(id), {type: type});
      return dispatchedActions.pop();
    }

    // Hover.
    expect(
      hoverHex('3,0,-3', 'mouseenter')
    ).toEqual(
      actions.setHoveredTile({
        card: createGameArea(state).props.orangePieces['3,0,-3'].card,
        stats: {health: 20}
      })
    );
    expect(
      hoverHex('3,0,-3', 'mouseleave')
    ).toEqual(
      actions.setHoveredTile(null)
    );

    // Set selected card.
    expect(
      clickCard(c => c.props.visible && c.props.name === 'Attack Bot')
    ).toEqual(
      actions.setSelectedCard(0, 'orange')
    );

    // Place object.
    expect(
      clickHex('2,0,-2')
    ).toEqual(
      actions.placeCard('2,0,-2', 0)
    );

    dispatch(actions.passTurn('orange'));
    dispatch(actions.passTurn('blue'));

    // Set selected tile.
    expect(
      clickHex('2,0,-2')
    ).toEqual(
      actions.setSelectedTile('2,0,-2', 'orange')
    );

    // Move.
    expect(
      clickHex('1,0,-1')
    ).toEqual(
      actions.moveRobot('2,0,-2', '1,0,-1')
    );

    // TODO attack.
  });
});
