import Preact from 'preact';
import { createSubscribe } from 'mangojuice-react-core';

const Subscribe = createSubscribe({
  Component: Preact.Component,
  createElement: Preact.h
});

module.exports = Subscribe;
module.exports.default = Subscribe;
