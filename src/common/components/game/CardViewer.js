import React, { Component } from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import Sentence from '../cards/Sentence';
import { splitSentences } from '../../util/cards';

import Card from './Card';

class CardViewer extends Component {
  render() {
    return (
      <div style={{
        position: 'absolute',
        left: 10,
        top: 0,
        bottom: 0,
        margin: 'auto',
        height: 236 * 1.5
      }}>
        <ReactCSSTransitionGroup
          transitionName="card-viewer-fade"
          transitionEnterTimeout={100}
          transitionLeaveTimeout={100}>
          {
            this.props.hoveredCard &&
              <Card
                onCardClick={() => {}}
                onCardHover={() => {}}
                scale={1.5}
                stats={this.props.hoveredCard.stats}
                name={this.props.hoveredCard.card.name}
                type={this.props.hoveredCard.card.type}
                spriteID={this.props.hoveredCard.card.spriteID}
                text={splitSentences(this.props.hoveredCard.card.text).map(s => Sentence(s, {parsed: true}))}
                rawText={this.props.hoveredCard.card.text}
                img={this.props.hoveredCard.card.img}
                cost={this.props.hoveredCard.card.cost}
                cardStats={this.props.hoveredCard.card.stats}
                source={this.props.hoveredCard.card.source}
                selected={false}
                visible />
          }
        </ReactCSSTransitionGroup>
      </div>
    );
  }
}

const { object } = React.PropTypes;

CardViewer.propTypes = {
  hoveredCard: object
};

export default CardViewer;
