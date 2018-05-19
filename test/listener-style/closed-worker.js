'use strict';

self.close();

self.addEventListener('message', function () {
  self.postMessage({
    hello: 'world'
  });
});
