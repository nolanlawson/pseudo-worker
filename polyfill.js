'use strict';

if (typeof Worker === 'undefined') {
  global.Worker = require('./');
}