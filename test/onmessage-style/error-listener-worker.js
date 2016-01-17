'use strict';

self.onerror = function (err) {
  self.postMessage({error: true});
};

self.onmessage = function () {
  var foo = null;
  foo.bar = 'baz';
};