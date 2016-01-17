'use strict';

self.addEventListener('message', function (e) {
  if (e.data.error) {
    throw new Error('yolo');
  } else {
    self.postMessage(e.data);
  }
});