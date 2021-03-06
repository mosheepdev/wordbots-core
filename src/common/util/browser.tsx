import * as React from 'react';
import * as ReactGA from 'react-ga';
import { History } from 'history';

declare const window: {
  location: { pathname: string }
  process?: { title: string }
};

let currentLocation: string;

if (inBrowser()) {
  ReactGA.initialize('UA-345959-18');
}

export function inBrowser(): boolean {
  return !(typeof document === 'undefined' ||
    (window.process && window.process.title.includes('node')) ||
    (window.process && window.process.title.includes('test')));
}

export function logAnalytics(): void {
  if (inBrowser() && window.location.pathname !== currentLocation) {
    currentLocation = window.location.pathname;
    ReactGA.set({ page: currentLocation });
    ReactGA.pageview(currentLocation);
  }
}

export function transformHistory(history: History, func: (path: string) => string): void {
  if (history && history.location) {
    const currentPath = history.location.pathname;
    const newPath = func(currentPath === '/' ? '/home' : currentPath);
    history.push(newPath);
  }
}

export function getHash(history: History): string {
  return history && history.location.hash.split('#')[1];
}

export function setHash(history: History, hash: string): void {
  transformHistory(history, (path) => `${path}#${hash}`);
}

export function isFlagSet(flag: string): boolean {
  return typeof localStorage !== 'undefined' && localStorage[`wb$${flag}`] === 'true';
}

export function toggleFlag(flag: string): void {
  localStorage[`wb$${flag}`] = !isFlagSet(flag);
}

export function logIfFlagSet(flag: boolean, msg: string): void {
  if (flag) {
    /* tslint:disable:no-console */
    console.log(msg);
    /* tslint:enable:no-console */
  }
}

export function getGameAreaNode(): HTMLElement {
  return document.getElementById('gameArea') || document.body;
}

export function zeroWidthJoin(...items: Array<React.ReactElement<any>>): React.ReactElement<any> {
  return items.reduce((a, b) => <span>{a}&zwnj;{b}</span>);
}
