import express from 'express';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { RoutingContext, match } from 'react-router';
import createLocation from 'history/lib/createLocation';
import { applyMiddleware, createStore, combineReducers } from 'redux';
import { Provider } from 'react-redux';

import promiseMiddleware from 'lib/promiseMiddleware';
import fetchComponentData from 'lib/fetchComponentData';

import * as reducers from 'reducers';
import routes from 'routes';

const app = express();

app.use((req, res) => {
  const location = createLocation(req.url);
  const reducer = combineReducers(reducers);
  const store = applyMiddleware(promiseMiddleware)(createStore)(reducer);

  match({ routes, location }, (err, redirectLocation, renderProps) => {
    if (err) {
      console.error(err);
      return res.status(500).end('Internal server error');
    }

    if (!renderProps) return res.status(404).end('Not found.');

    function renderView() {
      const InitialComponent = (
        <Provider store={store}>
            <RoutingContext {...renderProps} />
        </Provider>
      );

      const initialState = store.getState();

      const componentHTML = renderToString(InitialComponent);
      const HTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Isomorphic Redux Demo</title>
        </head>
        <body>
          <div id="react-view">${componentHTML}</div>
          <script type="application/javascript">
            window.__INITIAL_STATE__ = ${JSON.stringify(initialState)};
          </script>
          <script type="application/javascript" src="/bundle.js"></script>
        </body>
      </html>
      `;
      return HTML;
    }

    fetchComponentData(store.dispatch, renderProps.components, renderProps.params)
      .then(renderView)
      .then(html => res.end(html))
      .catch(error => res.end(error.message));
  });
});

export default app;
