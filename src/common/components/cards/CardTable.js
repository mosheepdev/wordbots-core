import * as React from 'react';
import { arrayOf, bool, func, object } from 'prop-types';
import { Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn } from 'material-ui/Table';
import Badge from 'material-ui/Badge';

import { typeToString } from '../../constants.ts';
import { id } from '../../util/common.ts';
import CardStat from '../card/CardStat';

export default class CardTable extends React.Component {
  static propTypes = {
    cards: arrayOf(object),
    selectedCardIds: arrayOf(object),
    selectable: bool,

    onCardClick: func
  };

  sourceToString(source) {
    if (source === 'user') {
      return 'You';
    } else {
      return 'Built-In';
    }
  }

  handleCellClick = (row, col) => {
    this.props.onCardClick(this.props.cards[row].id);
  };

  renderCardRowStat(type, stats) {
    if (stats && stats[type]) {
      return (
        <CardStat
          noTooltip
          type={type}
          base={stats ? stats[type] : ''}
          current={stats ? stats[type] : ''}
          scale={1} />
      );
    } else {
      return '';
    }
  }

  renderCardCost(cost) {
    return (
      <Badge
        badgeContent={cost}
        badgeStyle={{
          width: 30, height: 30, backgroundColor: '#00bcd4',
          fontFamily: 'Carter One', fontSize: 16, color: 'white'
        }}
        style={{padding: 0, width: 24, height: 24}} />
    );
  }

  renderCardRow = (card, index) => (
    <TableRow
      key={card.id || id()}
      selected={this.props.selectable && this.props.selectedCardIds.includes(card.id)}
      selectable={!this.props.selectable || card.source !== 'builtin'}
    >
      <TableRowColumn width={130}>{card.name}</TableRowColumn>
      <TableRowColumn width={50}>{typeToString(card.type)}</TableRowColumn>
      <TableRowColumn width={50}>{this.sourceToString(card.source)}</TableRowColumn>
      <TableRowColumn>{card.text}</TableRowColumn>
      <TableRowColumn width={30} style={{textAlign: 'center'}}>{this.renderCardRowStat('attack', card.stats)}</TableRowColumn>
      <TableRowColumn width={30} style={{textAlign: 'center'}}>{this.renderCardRowStat('health', card.stats)}</TableRowColumn>
      <TableRowColumn width={30} style={{textAlign: 'center'}}>{this.renderCardRowStat('speed', card.stats)}</TableRowColumn>
      <TableRowColumn width={30} style={{textAlign: 'center'}}>{this.renderCardCost(card.cost)}</TableRowColumn>
    </TableRow>
  );

  render() {
    return (
      <div>
        <div style={{
          width: 'calc(100% - 20px)',
          marginRight: 10,
          marginBottom: 20,
          boxShadow: 'rgba(0, 0, 0, 0.117647) 0px 1px 6px, rgba(0, 0, 0, 0.117647) 0px 1px 4px'
        }}>
          <Table
            className="cardTable"
            multiSelectable
            selectable={this.props.selectable}
            onCellClick={this.handleCellClick}
            style={{minWidth: 650}}
          >
            <TableHeader
              adjustForCheckbox={false}
              displaySelectAll={false}
              enableSelectAll={false}
            >
              <TableRow>
                <TableHeaderColumn width={130}>Name</TableHeaderColumn>
                <TableHeaderColumn width={50}>Type</TableHeaderColumn>
                <TableHeaderColumn width={50}>Creator</TableHeaderColumn>
                <TableHeaderColumn>Text</TableHeaderColumn>
                <TableHeaderColumn width={30}>Attack</TableHeaderColumn>
                <TableHeaderColumn width={30}>Health</TableHeaderColumn>
                <TableHeaderColumn width={30}>Speed</TableHeaderColumn>
                <TableHeaderColumn width={30}>Cost</TableHeaderColumn>
              </TableRow>
            </TableHeader>
            <TableBody
              displayRowCheckbox={false}
              deselectOnClickaway={false}
              showRowHover>
                {this.props.cards.map(this.renderCardRow)}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
}
