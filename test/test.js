'use strict';

var assert = require('assert');
var Promise = require('pouchdb-promise');
var uaParser = require('ua-parser-js');

var PseudoWorker = require('../');

var implementations = ['pseudo-worker'];

// Not testing WebWorkers in any implementation other than Blink.
// Firefox's seems to have weird edge cases causing Mocha to error out
// early, and I need some standard to code to.
if (process.browser) {
  var ua = uaParser(navigator.userAgent);
  if (ua.browser.name === 'Chrome' && ua.os.name !== 'Android') {
    implementations.unshift('worker');
  }
} else {
  // Shim for XHR in order to test in Node (nice for coverage reports)
  global.XMLHttpRequest = require('./xhr-shim');
}

// because IE8 support
function each(arr, fun) {
  var i = -1;
  var len = arr.length;
  while (++i < len) {
    fun(arr[i]);
  }
}

// Test both the worker and pseudoworker to ensure equivalent implementations.
each(implementations, function (workerType) {

  function createWorker(script) {
    return workerType === 'worker' ?
      new Worker(script) : new PseudoWorker(script);
  }

  describe(workerType + ': listener style', function () {

    this.timeout(60000);

    function workerPromise(script, toSend) {
      return Promise.resolve().then(function () {
        return createWorker(script);
      }).then(function (worker) {
        return new Promise(function (resolve, reject) {
          worker.addEventListener('message', function (e) {
            resolve(e.data);
            worker.terminate();
          });
          worker.addEventListener('error', function (e) {
            reject(e);
            worker.terminate();
          });
          worker.postMessage(toSend);
        });
      });
    }

    it('test basic', function () {
      var workerScript = 'test/listener-style/basic-worker.js';
      return workerPromise(workerScript, {}).then(function (data) {
        assert.equal(data.hello, 'world');
      });
    });

    it('test blob URL', function () {
      var blob = new Blob([
          "'use strict';self.addEventListener('message', function () {  " +
          "self.postMessage({    hello: 'world'  });});"
      ], { type: 'application/javascript' });
      var url = URL.createObjectURL(blob);
      return workerPromise(url, {}).then(function (data) {
        assert.equal(data.hello, 'world');
      });
    });

    it('test invalid script', function () {
      var workerScript = 'test/listener-style/404.js';
      return workerPromise(workerScript, {}).then(function () {
        throw new Error('expected an error');
      }, function (e) {
        assert(e);
        assert.equal(e.type, 'error');
      });
    });

    it('echoes correctly', function () {
      var obj = {hello: {world: 'yo'}};
      var workerScript = 'test/listener-style/echo-worker.js';
      return workerPromise(workerScript, obj).then(function (data) {
        assert.deepEqual(data, obj);
      });
    });

    it('errors correctly', function () {
      var workerScript = 'test/listener-style/error-worker.js';
      return workerPromise(workerScript, null).then(function () {
        throw new Error('expected an error');
      }, function (e) {
        assert.equal(e.type, 'error');
        assert.equal(typeof e.message, 'string');
      });
    });

    it('errors on undefined postMessage()', function () {
      var worker = createWorker('test/listener-style/echo-worker.js');
      return Promise.resolve().then(function () {
        worker.postMessage();
      }).then(function () {
        throw new Error('expected an error');
      }, function (e) {
        assert(e);
        worker.terminate();
      });
    });

    it('emits multiple things', function () {
      var worker = createWorker('test/listener-style/echo-worker.js');
      return new Promise(function (resolve) {
        var count = 0;
        worker.addEventListener('message', function () {
          if (++count === 3) {
            resolve();
          }
        });
        worker.postMessage(null);
        worker.postMessage(null);
        worker.postMessage(null);
      }).then(function () {
        worker.terminate();
      });
    });

    it('emits multiple things and errors', function () {
      var worker = createWorker('test/listener-style/echo-and-error-worker.js');
      return new Promise(function (resolve, reject) {
        var count = 0;
        worker.addEventListener('message', function () {
          count++;
          if (count === 3) {
            worker.postMessage({error: true});
          }
        });
        worker.addEventListener('error', function () {
          if (count === 3) {
            resolve();
          } else {
            reject();
          }
        });
        worker.postMessage({error: false});
        worker.postMessage({error: false});
        worker.postMessage({error: false});
      }).then(function () {
        worker.terminate();
      });
    });

    it('emits multiple things and errors - with removeEventListener', function () {
      var worker = createWorker('test/listener-style/echo-and-error-worker.js');
      return new Promise(function (resolve, reject) {
        var count = 0;
        worker.addEventListener('message', function () {
          count++;
          if (count === 3) {
            worker.postMessage({error: true});
          }
        });
        var listener = function () {
          count += 1000;
        };
        var listener2 = function () {
          count += 1000;
        };
        worker.addEventListener('error', listener);
        worker.addEventListener('error', function () {
          if (count === 3) {
            resolve();
          } else {
            reject();
          }
        });
        worker.addEventListener('error', listener2);
        worker.removeEventListener('error', listener);
        worker.removeEventListener('error', listener2);
        worker.postMessage({error: false});
        worker.postMessage({error: false});
        worker.postMessage({error: false});
      }).then(function () {
        worker.terminate();
      });
    });

    it('does nothing after termination', function () {
      var worker = createWorker('test/listener-style/echo-worker.js');
      return new Promise(function (resolve, reject) {
        var count = 0;
        worker.addEventListener('message', function () {
          count++;
          if (count === 1) {
            worker.terminate();
            worker.postMessage({});
            setTimeout(resolve, 1000); // prove a negative
          } else {
            reject();
          }
        });
        worker.addEventListener('error', function (err) {
          reject(err);
        });
        worker.postMessage({});
      });
    });

    it('does nothing after termination from inside worker', function () {
      var worker = createWorker('test/listener-style/closed-worker.js');
      return new Promise(function (resolve, reject) {
        worker.addEventListener('message', function () {
          reject();
        });
        worker.addEventListener('error', function (err) {
          reject(err);
        });
        worker.postMessage({});
        setTimeout(resolve, 1000); // prove a negative
      });
    });

    it('removeEventListener - message 1', function () {
      var worker = createWorker('test/listener-style/echo-worker.js');
      var a = 0;
      var b = 0;
      var c = 0;
      var d = 0;
      return new Promise(function (resolve, reject) {
        function listenerA() {
          a++;
        }
        function listenerB() {
          b++;
          worker.removeEventListener('message', listenerA);
        }
        function listenerC() {
          c++;
          if (c === 2) {
            worker.removeEventListener('message', listenerB);
          }
        }
        function listenerD() {
          d++;
          if (d === 4) {
            return resolve();
          }
          if (d === 3) {
            worker.removeEventListener('message', listenerC);
          }
          post();
        }
        function post() {
          setTimeout(function () {
            worker.postMessage({});
          }, 0);
        }
        worker.addEventListener('message', listenerA);
        worker.addEventListener('message', listenerB);
        worker.addEventListener('message', listenerC);
        worker.addEventListener('message', listenerD);
        worker.addEventListener('error', function (err) {
          reject(err);
        });
        post();
      }).then(function () {
        assert.equal(a, 1);
        assert.equal(b, 2);
        assert.equal(c, 3);
        assert.equal(d, 4);
      });
    });

    it('removeEventListener - message 2', function () {
      var worker = createWorker('test/listener-style/echo-worker.js');
      var a = 0;
      var b = 0;
      var c = 0;
      var d = 0;
      return new Promise(function (resolve, reject) {
        function listenerA() {
          a++;
        }
        function listenerB() {
          b++;
          worker.removeEventListener('message', listenerA);
        }
        function listenerC() {
          c++;
          if (c === 2) {
            worker.removeEventListener('message', listenerB);
          }
        }
        function listenerD() {
          d++;
          if (d === 4) {
            return resolve();
          }
          if (d === 3) {
            worker.removeEventListener('message', listenerC);
          }
          post();
        }
        function post() {
          setTimeout(function () {
            worker.postMessage({});
          }, 0);
        }
        worker.addEventListener('message', listenerC);
        worker.addEventListener('message', listenerB);
        worker.addEventListener('message', listenerD);
        worker.addEventListener('message', listenerA);
        worker.addEventListener('error', function (err) {
          reject(err);
        });
        post();
      }).then(function () {
        assert.equal(a, 0);
        assert.equal(b, 1);
        assert.equal(c, 3);
        assert.equal(d, 4);
      });
    });

    it('removeEventListener - message 3', function () {
      var worker = createWorker('test/listener-style/echo-worker.js');
      var zero = 0;
      var a = 0;
      var b = 0;
      var c = 0;
      var d = 0;
      return new Promise(function (resolve, reject) {
        function listener0() {
          zero++;
          if (zero === 3) {
            worker.removeEventListener('message', listenerC);
          }
        }
        function listenerA() {
          a++;
        }
        function listenerB() {
          b++;
          worker.removeEventListener('message', listenerA);
        }
        function listenerC() {
          c++;
          if (c === 2) {
            worker.removeEventListener('message', listenerB);
          }
        }
        function listenerD() {
          d++;
          if (d === 4) {
            return resolve();
          }
          if (d === 3) {
            worker.removeEventListener('message', listenerC);
          }
          post();
        }
        function post() {
          setTimeout(function () {
            worker.postMessage({});
          }, 0);
        }
        worker.addEventListener('message', listener0);
        worker.addEventListener('message', listenerD);
        worker.addEventListener('message', listenerB);
        worker.addEventListener('message', listenerC);
        worker.addEventListener('message', listenerA);
        worker.addEventListener('error', function (err) {
          reject(err);
        });
        post();
      }).then(function () {
        assert.equal(zero, 4);
        assert.equal(a, 0);
        assert.equal(b, 2);
        assert.equal(c, 2);
        assert.equal(d, 4);
      });
    });

    it('removeEventListener - message 4', function () {
      var worker = createWorker('test/listener-style/echo-worker.js');
      var zero = 0;
      var a = 0;
      var b = 0;
      var c = 0;
      var d = 0;
      return new Promise(function (resolve, reject) {
        function listener0() {
          zero++;
          if (zero === 3) {
            worker.removeEventListener('message', listenerC);
          }
        }
        function listenerA() {
          a++;
        }
        function listenerB() {
          b++;
          worker.removeEventListener('message', listenerA);
        }
        function listenerC() {
          c++;
          if (c === 2) {
            worker.removeEventListener('message', listenerB);
          }
        }
        function listenerD() {
          d++;
          if (d === 4) {
            return resolve();
          }
          if (d === 3) {
            worker.removeEventListener('message', listenerC);
          }
          post();
        }
        function post() {
          setTimeout(function () {
            worker.postMessage({});
          }, 0);
        }
        worker.addEventListener('message', listener0);
        worker.addEventListener('message', listenerA);
        worker.addEventListener('message', listenerD);
        worker.addEventListener('message', listenerC);
        worker.addEventListener('message', listenerB);
        worker.addEventListener('error', function (err) {
          reject(err);
        });
        post();
      }).then(function () {
        assert.equal(zero, 4);
        assert.equal(a, 1);
        assert.equal(b, 1);
        assert.equal(c, 2);
        assert.equal(d, 4);
      });
    });

    it('error listener inside worker itself', function () {
      var worker = createWorker('test/listener-style/error-listener-worker.js');
      return new Promise(function (resolve) {

        var count = 0;

        function checkDone() {
          if (++count === 2) {
            resolve();
          }
        }

        worker.addEventListener('message', function (e) {
          assert.equal(e.data.error, true);
          checkDone();
        });

        worker.addEventListener('error', function (err) {
          assert(err);
          assert.equal(err.type, 'error');
          assert.equal(typeof err.message, 'string');
          checkDone();
        });

        worker.postMessage({});
      }).then(function () {
        worker.terminate();
      });
    });

    it('multiple listeners', function () {
      var worker = createWorker('test/listener-style/echo-worker.js');
      return new Promise(function (resolve) {

        var count = 0;

        function checkDone() {
          if (++count === 2) {
            resolve();
          }
        }

        worker.addEventListener('message', function () {
          checkDone();
        });

        worker.addEventListener('message', function () {
          checkDone();
        });

        worker.postMessage({});
      }).then(function () {
        worker.terminate();
      });
    });

    it('multiple listeners in worker', function () {
      var worker = createWorker('test/listener-style/echo-twice-worker.js');
      return new Promise(function (resolve) {

        var count = 0;

        function checkDone() {
          if (++count === 2) {
            resolve();
          }
        }

        worker.addEventListener('message', function () {
          checkDone();
        });

        worker.postMessage({});
      }).then(function () {
        worker.terminate();
      });
    });

    it('guarantee FIFO order', function () {
      var worker = createWorker('test/listener-style/echo-all-in-order.js');
      var messages = [];
      return new Promise(function (resolve) {

        var count = 0;

        function checkDone() {
          if (++count === 3) {
            resolve();
          }
        }

        worker.addEventListener('message', function (e) {
          messages.push(e.data.messages);
          checkDone();
        });

        worker.postMessage('a');
        worker.postMessage('b');
        worker.postMessage('c');
      }).then(function () {
        worker.terminate();
      }).then(function () {
        assert.deepEqual(messages, [
          ['a'],
          ['a', 'b'],
          ['a', 'b', 'c']
        ])
      });
    });
  });

  describe(workerType + ': onmessage style', function () {

    this.timeout(60000);

    function workerPromise(script, toSend) {
      return Promise.resolve().then(function () {
        return createWorker(script);
      }).then(function (worker) {
        return new Promise(function (resolve, reject) {
          worker.onmessage = function (e) {
            resolve(e.data);
            worker.terminate();
          };
          worker.onerror = function (e) {
            reject(e);
            worker.terminate();
          };
          worker.postMessage(toSend);
        });
      });
    }

    it('test basic', function () {
      var workerScript = 'test/onmessage-style/basic-worker.js';
      return workerPromise(workerScript, {}).then(function (data) {
        assert.equal(data.hello, 'world');
      });
    });

    it('test invalid script', function () {
      var workerScript = 'test/onmessage-style/404.js';
      return workerPromise(workerScript, {}).then(function () {
        throw new Error('expected an error');
      }, function (e) {
        assert(e);
        assert.equal(e.type, 'error');
      });
    });

    it('echoes correctly', function () {
      var obj = {hello: {world: 'yo'}};
      var workerScript = 'test/onmessage-style/echo-worker.js';
      return workerPromise(workerScript, obj).then(function (data) {
        assert.deepEqual(data, obj);
      });
    });

    it('errors correctly', function () {
      var workerScript = 'test/onmessage-style/error-worker.js';
      return workerPromise(workerScript, null).then(function () {
        throw new Error('expected an error');
      }, function (e) {
        assert.equal(e.type, 'error');
        assert.equal(typeof e.message, 'string');
      });
    });

    it('emits multiple things', function () {
      var worker = createWorker('test/onmessage-style/echo-worker.js');
      return new Promise(function (resolve) {
        var count = 0;
        worker.onmessage = function () {
          if (++count === 3) {
            resolve();
          }
        };
        worker.postMessage(null);
        worker.postMessage(null);
        worker.postMessage(null);
      }).then(function () {
        worker.terminate();
      });
    });

    it('emits multiple things and errors', function () {
      var workerScript = 'test/onmessage-style/echo-and-error-worker.js';
      var worker = createWorker(workerScript);
      return new Promise(function (resolve, reject) {
        var count = 0;
        worker.onmessage = function () {
          count++;
          if (count === 3) {
            worker.postMessage({error: true});
          }
        };
        worker.onerror = function () {
          if (count === 3) {
            resolve();
          } else {
            reject();
          }
        };
        worker.postMessage({error: false});
        worker.postMessage({error: false});
        worker.postMessage({error: false});
      }).then(function () {
        worker.terminate();
      });
    });

    it('does nothing after termination', function () {
      var worker = createWorker('test/onmessage-style/echo-worker.js');
      return new Promise(function (resolve, reject) {
        var count = 0;
        worker.onmessage = function () {
          count++;
          if (count === 1) {
            worker.terminate();
            worker.postMessage({});
            setTimeout(resolve, 1000); // prove a negative
          } else {
            reject();
          }
        };
        worker.onerror = function (err) {
          reject(err);
        };
        worker.postMessage({});
      });
    });

    it('error listener inside worker itself', function () {
      var workerScript = 'test/onmessage-style/error-listener-worker.js';
      var worker = createWorker(workerScript);
      return new Promise(function (resolve) {

        var count = 0;

        function checkDone() {
          if (++count === 2) {
            resolve();
          }
        }

        worker.onmessage = function (e) {
          assert.equal(e.data.error, true);
          checkDone();
        };

        worker.onerror = function (err) {
          assert(err);
          assert.equal(err.type, 'error');
          assert.equal(typeof err.message, 'string');
          checkDone();
        };

        worker.postMessage({});
      }).then(function () {
        worker.terminate();
      });
    });

    it('multiple listeners', function () {
      var worker = createWorker('test/onmessage-style/echo-worker.js');
      return new Promise(function (resolve) {

        var count = 0;

        function checkDone() {
          if (++count === 2) {
            resolve();
          }
        }

        worker.onmessage = function () {
          checkDone();
        };

        worker.addEventListener('message', function () {
          checkDone();
        });

        worker.postMessage({});
      }).then(function () {
        worker.terminate();
      });
    });

    it('multiple listeners in worker', function () {
      var worker = createWorker('test/onmessage-style/echo-twice-worker.js');
      return new Promise(function (resolve) {

        var count = 0;

        function checkDone() {
          if (++count === 2) {
            resolve();
          }
        }

        worker.onmessage = function () {
          checkDone();
        };

        worker.postMessage({});
      }).then(function () {
        worker.terminate();
      });
    });

    it('guarantee FIFO order', function () {
      var worker = createWorker('test/onmessage-style/echo-all-in-order.js');
      var messages = [];
      return new Promise(function (resolve) {

        var count = 0;

        function checkDone() {
          if (++count === 3) {
            resolve();
          }
        }

        worker.onmessage = function (e) {
          messages.push(e.data.messages);
          checkDone();
        };

        worker.postMessage('a');
        worker.postMessage('b');
        worker.postMessage('c');
      }).then(function () {
        worker.terminate();
      }).then(function () {
        assert.deepEqual(messages, [
          ['a'],
          ['a', 'b'],
          ['a', 'b', 'c']
        ])
      });
    });

  });

});
