import React, { Component } from 'react';
import { bool, func, object } from 'prop-types';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import AppBar from 'material-ui/AppBar';
import IconButton from 'material-ui/IconButton';
import FontIcon from 'material-ui/FontIcon';
import FlatButton from 'material-ui/FlatButton';
import Popover from 'material-ui/Popover';
import Menu from 'material-ui/Menu';
import MenuItem from 'material-ui/MenuItem';
/* eslint-disable import/no-unassigned-import */
import 'whatwg-fetch';
/* eslint-enable import/no-unassigned-import */

import { isFlagSet, toggleFlag } from '../util/browser';
import { logout } from '../util/firebase';
import * as actions from '../actions/global';
import RouterDialog from '../components/RouterDialog';
import Tooltip from '../components/Tooltip';

function mapStateToProps(state) {
  return {
    user: state.global.user,
    sidebarOpen: state.global.sidebarOpen
  };
}

function mapDispatchToProps(dispatch) {
  return {
    onRerenderApp(value) {
      dispatch(actions.rerender(value));
    }
  };
}

class TitleBar extends Component {
  static propTypes = {
    user: object,
    sidebarOpen: bool,

    history: object,

    onRerenderApp: func
  };

  constructor(props) {
    super(props);

    this.state = {
      userOpen: false,
      anchorEl: null
    };
  }

  openLoginDialog = () => {
    RouterDialog.openDialog(this.props.history, 'login');
  }

  openUserMenu = (event) => {
    event.preventDefault();

    this.setState({
      userOpen: true,
      anchorEl: event.currentTarget
    });
  }

  closeUserMenu = () => {
    this.setState({userOpen: false});
  }

  toggleSidebar = () => {
    toggleFlag('sidebarCollapsed');
    this.props.onRerenderApp();
  }

  get userMenu() {
    if (this.props.user) {
      return (
        <div style={{marginTop: 7}}>
          <FlatButton
            style={{color: 'white'}}
            label={this.props.user.displayName}
            labelPosition="before"
            onTouchTap={(e) => this.openUserMenu(e)}
            icon={<FontIcon className="material-icons">account_circle</FontIcon>} />
          <Popover
            open={this.state.userOpen}
            anchorEl={this.state.anchorEl}
            anchorOrigin={{horizontal: 'right', vertical: 'bottom'}}
            targetOrigin={{horizontal: 'right', vertical: 'top'}}
            onRequestClose={this.closeUserMenu}>
            <Menu>
              <MenuItem
                primaryText="Logout"
                onClick={() => { logout(); this.closeUserMenu(); }}
                leftIcon={<FontIcon className="material-icons">exit_to_app</FontIcon>} />
            </Menu>
          </Popover>
        </div>
      );
    } else {
      return (
        <FlatButton
          label="Login"
          labelPosition="before"
          onTouchTap={this.openLoginDialog}
          icon={<FontIcon className="material-icons">person</FontIcon>} />
      );
    }
  }

  render() {
    return (
      <div style={{height: 64}}>
        <AppBar
          title={
            <div style={{
              color: '#fff', fontFamily: 'Carter One', fontSize: 32
            }}>WORDBOTS</div>
          }
          style={{
            position: 'fixed',
            top: 0
          }}
          iconElementLeft={
            <Tooltip
              text={isFlagSet('sidebarCollapsed') ? 'Expand Menu' : 'Collapse Menu' }
              place="right"
            >
              <IconButton onClick={this.toggleSidebar}>
                <FontIcon className="material-icons" color="white">menu</FontIcon>
              </IconButton>
            </Tooltip>
          }
          iconElementRight={this.userMenu}
        />
      </div>
    );
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(TitleBar));