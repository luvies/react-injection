import 'reflect-metadata';

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { InjectionProvider } from './di';
import './index.css';
import { configure } from './inversify.config';
import * as serviceWorker from './serviceWorker';

const container = configure();

ReactDOM.render(
  <InjectionProvider container={container}>
    <App />
  </InjectionProvider>,
  document.getElementById('root'),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
