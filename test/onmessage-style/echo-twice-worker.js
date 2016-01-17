'use strict';

self.onmessage = function (e) {
  self.postMessage(e.data);
  setTimeout(function () {
    self.postMessage(e.data);
  }, 200);
};