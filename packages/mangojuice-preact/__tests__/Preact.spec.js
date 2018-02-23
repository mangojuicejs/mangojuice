import AbstractTests from 'mangojuice-react-core/tests';
import Preact from 'preact';
import Subscribe from 'mangojuice-preact';

const React = { createElement: Preact.h, Component: Preact.Component };
const ReactDOM = { render: Preact.render };
AbstractTests(React, ReactDOM, Subscribe, 'Preact');
