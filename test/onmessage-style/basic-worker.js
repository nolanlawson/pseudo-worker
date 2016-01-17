'use strict';

self.onmessage = function () {
  self.postMessage({
    hello: 'world'
  });
};