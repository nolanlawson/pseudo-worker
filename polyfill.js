'use strict';

var PseudoWorker = require('./');

if (typeof Worker === 'undefined') {
  global.Worker = PseudoWorker;
}

module.exports = PseudoWorker;