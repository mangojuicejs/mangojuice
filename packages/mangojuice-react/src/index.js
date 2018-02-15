import React from 'react';
import { createSubscribe } from 'mangojuice-react-core';

const Subscribe = createSubscribe({
  Component: React.Component,
  createElement: React.createElement
});

module.exports = Subscribe;
module.exports.default = Subscribe;
