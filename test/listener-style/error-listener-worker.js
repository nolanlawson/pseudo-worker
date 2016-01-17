'use strict';

self.addEventListener('error', function (err) {
  self.postMessage({error: true});
});

self.addEventListener('message', function () {
  var foo = null;
  foo.bar = 'baz';
});