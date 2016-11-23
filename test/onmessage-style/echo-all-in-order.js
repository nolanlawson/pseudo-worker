'use strict';

var messages = [];

self.onmessage = function (e) {
  messages.push(e.data);
  self.postMessage({
    messages: messages.slice()
  });
};