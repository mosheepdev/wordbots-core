import * as WebSocket from 'ws';

export type ClientID = string;
export type ActionType = string;
export type ActionPayload = any;

// TODO Figure these types out
export type Deck = any;
export type GameState = any;

export interface Action {
  type: ActionType,
  payload: ActionPayload
}

export interface UserData {
  uid: string,
  displayName: string
}

export interface Game {
  id: ClientID,
  name: string,
  format: string,
  type: string,
  players: ClientID[],
  playerColors: { [clientID: string]: string; },
  ids: { blue: ClientID, orange: ClientID }, // TODO is this field necessary?
  spectators: ClientID[],
  actions: Action[],
  state: GameState,
  decks: { blue: Deck, orange: Deck },
  usernames: { blue: string, orange: String },
  startingSeed: string
}

export interface WaitingPlayer {
  id: string,
  name: string,
  format: string,
  deck: Deck,
  players: ClientID[]
}

export interface PlayerInQueue {
  clientID: ClientID,
  deck: Deck
}

interface ServerStateType {
  connections: { [clientID: string]: WebSocket; },
  games: Game[],
  gameObjects: { [gameID: string]: Game; }
  waitingPlayers: WaitingPlayer[],
  matchmakingQueue: PlayerInQueue[]
  playersOnline: ClientID[],
  userData: { [clientID: string]: UserData; }
}