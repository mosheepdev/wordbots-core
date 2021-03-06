import * as React from 'react';
import { arrayOf, number, object } from 'prop-types';
import { times } from 'lodash';

import asyncComponent from '../AsyncComponent';

const BarChart = asyncComponent(() => import(/* webpackChunkName: 'react-bar-chart' */ 'react-bar-chart'));

// Widget to display the current energy curve for a set of cards
export default class EnergyCurve extends React.Component {
  static propTypes = {
    cards: arrayOf(object),
    height: number
  };

  static defaultProps = {
    height: 130
  }

  state = {
    width: 200
  };

  componentDidMount() {
    this.updateWidth();

    window.addEventListener('resize', () => {
      this.updateWidth();
    });
  }

  updateWidth() {
    if (this.node) {
      this.setState({
        width: this.node.offsetWidth
      });
    }
  }

  parseCards(cards) {
    const curve = {};

    cards.forEach(card => {
      if (card.cost > 10)
        curve[10] ? curve[10] += 1 : curve[10] = 1;
      else
        curve[card.cost] ? curve[card.cost] += 1 : curve[card.cost] = 1;
    });

    const data = [];

    times(10, (i) => {
      data.push({
        text: i.toString(),
        value: curve[i] || 0
      });
    });

    data.push({
      text: '10+',
      value: curve[10] || 0
    });

    return data;
  }

  render() {
    const margins = {
      top: 15,
      right: 10,
      bottom: 20,
      left: 10
    };

    return (
      <div ref={(node) => { this.node = node; }}>
        <BarChart
          width={this.state.width}
          height={this.props.height}
          margin={margins}
          data={this.parseCards(this.props.cards)} />
      </div>
    );
  }
}
