pseudo-worker
====

A tiny and mostly spec-compliant [WebWorker](https://www.w3.org/TR/workers/) polyfill, 
designed for [browsers that don't support WebWorkers](http://caniuse.com/#feat=webworkers), 
or for browsers that don't support certain features of WebWorkers (e.g. 
IndexedDB in Safari).

This runs on the main thread, so you don't get any of the multithreading
benefits of WebWorkers. However, it should be "good enough" for the
less-compliant browsers.

The bundle size is very small: **849 bytes** after uglify+gzip!

Install
-----

    npm install pseudo-worker

Usage
----

### Via Browserify/Webpack

```js
var PseudoWorker = require('pseudo-worker');

var worker = typeof WebWorker !== 'undefined' ?
  new Worker('script.js') :
  new PseudoWorker('script.js');
```

Or as a polyfill:

```js
require('pseudo-worker/polyfill');
// now window.Worker is polyfilled in older browsers
```

### Via script tags

Or if you aren't using Browserify or Webpack, download it from [wzrd.in](http://wzrd.in/):

```html
<script src="https://wzrd.in/standalone/pseudo-worker"></script>
```

Then it's available as `window.PseudoWorker`. To use it as a polyfill, just do:

```js
if (typeof window.Worker === 'undefined') {
  window.Worker = window.PseudoWorker;
}
```

Supported APIS
----

### Outside the worker

* `worker.onmessage`
* `worker.onerror`
* `worker.addEventListener` 
* `worker.postMessage`

### Inside the worker

* `self.onmessage`
* `self.onerror`
* `self.addEventListener`
* `self.postMessage`

**Note:** inside the worker, you _must_ use the `self` variable instead 
of the implicit global object. I.e. do this:

```js
self.onmessage = ...
```

Not this:

```js
onmessage = ...
```

Testing the library
---

First:

    npm install

Then to test in Node (using an XHR shim):

    npm test
    
Or to test manually in your browser of choice:

    npm run test-local

Or to test in a browser using SauceLabs:

    npm run test-browser

Or to test in PhantomJS:

    npm run test-phantom

Or to test with coverage reports:

    npm run coverage