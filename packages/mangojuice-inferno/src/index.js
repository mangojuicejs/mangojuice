import { Component } from 'inferno-component';
import { createElement } from 'inferno-create-element';
import { createSubscribe } from 'mangojuice-react-core';

const Subscribe = createSubscribe({
  Component: Component,
  createElement: createElement,
});

module.exports = Subscribe;
module.exports.default = Subscribe;
