'use strict';

var messages = [];

self.addEventListener('message', function (e) {
  messages.push(e.data);
  self.postMessage({
    messages: messages.slice()
  });
});