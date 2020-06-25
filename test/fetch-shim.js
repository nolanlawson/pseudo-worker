'use strict';

var fs = require('fs');

function fetch (path) {
  return Promise.resolve({
    text: function () {
      return fs.readFileSync(path, 'utf-8');
    }
  });
}

module.exports = fetch;
