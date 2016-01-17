pseudo-worker [![Build Status](https://travis-ci.org/nolanlawson/pseudo-worker.svg?branch=master)](https://travis-ci.org/nolanlawson/pseudo-worker) [![Coverage Status](https://coveralls.io/repos/nolanlawson/pseudo-worker/badge.svg?branch=master&service=github)](https://coveralls.io/github/nolanlawson/pseudo-worker?branch=master)
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

```js
var PseudoWorker = require('pseudo-worker');
var worker = new PseudoWorker('script.js');
```

Or as a polyfill:

```js
require('pseudo-worker/polyfill');
// now window.Worker is polyfilled in older browsers
```

Instead of Browserify/Webpack, you can also use it directly as a script tag by [downloading it from wzrd.in](https://wzrd.in/standalone/pseudo-worker):

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

* `onmessage`
* `onerror`
* `addEventListener`
* `postMessage`

**Note:** inside the worker, you _must_ use the `self` variable instead 
of the implicit global object. I.e. do this:

```js
self.onmessage = ...
```

Not this:

```js
onmessage = ...
```

Supported browsers
---

The full list of browsers that are tested in CI are in [.zuul.yml](https://github.com/nolanlawson/pseudo-worker/blob/master/.zuul.yml). But basically:

* Chrome
* Firefox
* Safari 7+
* IE 8+
* iOS 7.0+
* Android 4.0+

Node.js is not supported. Check out [node-webworker](https://github.com/pgriess/node-webworker) instead.

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