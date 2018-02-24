import AbstractTests from 'mangojuice-react-core/tests';
import Subscribe from 'mangojuice-inferno';
import { Component } from 'inferno-component';
import { createElement } from 'inferno-create-element';
import { render } from 'inferno';


const React = { createElement, Component };
const ReactDOM = {
  render,
  unmountComponentAtNode: render.bind(null, createElement(() => {}))
};
AbstractTests(React, ReactDOM, Subscribe, 'Inferno');
