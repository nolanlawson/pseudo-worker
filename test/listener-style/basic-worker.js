'use strict';

self.addEventListener('message', function () {
  self.postMessage({
    hello: 'world'
  });
});