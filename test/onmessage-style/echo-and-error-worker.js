'use strict';

self.onmessage = function (e) {
  if (e.data.error) {
    throw new Error('yolo');
  } else {
    self.postMessage(e.data);
  }
};