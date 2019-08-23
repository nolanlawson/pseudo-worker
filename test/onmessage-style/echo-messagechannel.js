'use strict';

self.onmessage = function (e) {
  e.ports[0].postMessage(e.data);
};