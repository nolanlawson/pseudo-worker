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

## Via Browserify/Webpack

```js
var PseudoWorker = require('pseudoworker');

var worker = typeof WebWorker !== 'undefined ?
  new Worker('script.js') :
  new PseudoWorker('script.js');
```

Or as a polyfill:

```js
require('pseudoworker/polyfill');
// now window.Worker is polyfilled in older browsers
```

## Via script tags

Or if you aren't using Browserify or Webpack, download it from [wzrd.in](http://wzrd.in/):

```html
<script src="https://wzrd.in/standalone/pseudo-worker"></script>
```

Then it's available as `window.PseudoWorker`. To use it as a polyfill, it's just:

```js
if (typeof window.Worker === 'undefined') {
  window.Worker = window.PseudoWorker;
}
```