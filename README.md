pseudoworker
====

A mostly spec-compliant [WebWorker](https://www.w3.org/TR/workers/) polyfill, 
designed for [browsers that don't support WebWorkers](http://caniuse.com/#feat=webworkers), 
or for browsers that don't support certain features of WebWorkers (e.g. 
IndexedDB in Safari WebWorkers).

This runs on the main thread, so you don't get any of the multithreading
benefits of WebWorkers. However, it should be "good enough" for the
less-compliant browsers.

The bundle size is very small: 

Install
-----

    npm install pseudoworker

Usage
----

```js
var PseudoWorker = require('pseudoworker');

var worker = typeof WebWorker !== 'undefined ?
  new Worker('script.js') :
  new PseudoWorker('script.js');
```

Or as a polyfill:

```js
require('pseudoworker/polyfill');
// now window.WebWorker is the polyfill in older browsers
```