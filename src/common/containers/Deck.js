import * as React from 'react';
import { arrayOf, bool, func, object, string } from 'prop-types';
import Helmet from 'react-helmet';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import Paper from '@material-ui/core/Paper';
import { compact, find, noop } from 'lodash';

import { getDisplayedCards } from '../util/cards.ts';
import ActiveDeck from '../components/cards/ActiveDeck';
import CardCollection from '../components/cards/CardCollection';
import EnergyCurve from '../components/cards/EnergyCurve';
import FilterControls from '../components/cards/FilterControls';
import LayoutControls from '../components/cards/LayoutControls';
import SearchControls from '../components/cards/SearchControls';
import SortControls from '../components/cards/SortControls';
import * as collectionActions from '../actions/collection.ts';

function mapStateToProps(state) {
  return {
    id: state.collection.deckBeingEdited ? state.collection.deckBeingEdited.id : null,
    cards: state.collection.cards,
    deck: state.collection.deckBeingEdited,
    loggedIn: state.global.user !== null
  };
}

function mapDispatchToProps(dispatch) {
  return {
    onSaveDeck: function (id, name, cardIds) {
      dispatch(collectionActions.saveDeck(id, name, cardIds));
    }
  };
}

class Deck extends React.Component {
  static propTypes = {
    id: string,
    cards: arrayOf(object),
    deck: object,
    loggedIn: bool,

    history: object,

    onSaveDeck: func
  };

  constructor(props) {
    super(props);

    this.state = {
      filters: {
        robots: true,
        events: true,
        structures: true
      },
      costRange: [0, 20],
      sortCriteria: 3,
      sortOrder: 0,
      searchText: '',
      selectedCardIds: (props.deck && props.deck.cardIds) || [],
      layout: 0
    };
  }

  get selectedCards() {
    return compact(this.state.selectedCardIds.map(id => find(this.props.cards, { id })));
  }

  get displayedCards() {
    const { searchText, filters, costRange, sortCriteria, sortOrder } = this.state;
    return getDisplayedCards(this.props.cards, { searchText, filters, costRange, sortCriteria, sortOrder });
  }

  // this.set(key)(value) = this.setState({key: value})
  set = (key, callback = noop) => (value) => {
    this.setState({[key]: value}, callback);
  }

  toggleFilter = (filter) => (e, toggled) => {
    this.setState(state => ({
      filters: Object.assign({}, state.filters, {[filter]: toggled})
    }));
  }

  handleSelectCards = (selectedCardIds) => {
    this.setState({ selectedCardIds });
  }

  handleClickSaveDeck = (id, name, cardIds) => {
    this.props.onSaveDeck(id, name, cardIds);
    this.props.history.push('/decks');
  }

  handleClickIncreaseCardCount = (id) => {
    this.setState(state => {
      state.selectedCardIds.push(id);
      return state;
    });
  }

  handleClickDecreaseCardCount = (id) => {
    this.setState(state => {
      state.selectedCardIds.splice(state.selectedCardIds.indexOf(id), 1);
      return state;
    });
  }

  handleRemoveCard = (id) => {
    this.setState(state => {
      state.selectedCardIds = state.selectedCardIds.filter(cardId => cardId !== id);
      return state;
    });
  }

  renderSidebarControls() {
    return (
      <Paper style={{padding: 20, marginBottom: 10}}>
        <SearchControls onChange={this.set('searchText')} />

        <LayoutControls
          layout={this.state.layout}
          onSetLayout={this.set('layout')} />

        <SortControls
          criteria={this.state.sortCriteria}
          order={this.state.sortOrder}
          onSetCriteria={this.set('sortCriteria')}
          onSetOrder={this.set('sortOrder')} />

        <FilterControls
          onToggleFilter={this.toggleFilter}
          onSetCostRange={this.set('costRange')} />
      </Paper>
    );
  }

  render() {
    return (
      <div>
        <Helmet title="Building Deck"/>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div style={{
            margin: '30px 10px 50px 30px',
            width: 300,
            minWidth: 300
          }}>
            <Paper style={{padding: 20, marginBottom: 20}}>
              <div style={{fontWeight: 100, fontSize: 28}}>Energy Curve</div>
              <EnergyCurve cards={this.selectedCards} />
            </Paper>

            {this.renderSidebarControls()}
          </div>

          <div style={{marginTop: 10, width: '100%'}}>
            <CardCollection
              allowMultipleSelection
              layout={this.state.layout}
              cards={this.displayedCards}
              selectedCardIds={this.state.selectedCardIds}
              onSelection={this.handleSelectCards} />
          </div>

          <div style={{
            margin: '30px 30px 50px 10px',
            width: 300,
            minWidth: 300
          }}>
            <Paper style={{padding: 20}}>
              <ActiveDeck
                id={this.props.id}
                name={this.props.deck ? this.props.deck.name : ''}
                cards={this.selectedCards}
                loggedIn={this.props.loggedIn}
                onIncreaseCardCount={this.handleClickIncreaseCardCount}
                onDecreaseCardCount={this.handleClickDecreaseCardCount}
                onRemoveCard={this.handleRemoveCard}
                onSaveDeck={this.handleClickSaveDeck} />
            </Paper>
          </div>
        </div>
      </div>
    );
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Deck));
