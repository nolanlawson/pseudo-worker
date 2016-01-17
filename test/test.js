'use strict';

var should = require('chai').should();
var Promise = require('pouchdb-promise');
var ua = require('ua-parser-js')(window.navigator.userAgent);

var PseudoWorker = require('../');

var implementations = ['pseudo-worker'];

// Not testing WebWorkers in any implementation other than WebKit/Blink.
// Firefox's seems to have weird edge cases causing Mocha to error out
// early, and I need some standard to code to.
if (ua.browser.name === 'Chrome' || ua.browser.name === 'Safari') {
  implementations.push('worker');
}

// Test both the worker and pseudoworker to ensure equivalent implementations.
implementations.forEach(function (workerType) {

  describe(workerType + ' test suite', function () {

    this.timeout(5000);

    function createWorker(script) {
      return workerType === 'worker' ?
        new Worker(script) : new PseudoWorker(script);
    }

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
      return workerPromise('test/basic-worker.js', {}).then(function (data) {
        data.hello.should.equal('world');
      });
    });

    it('test invalid script', function () {
      return workerPromise('test/404.js', {}).then(function () {
        throw new Error('expected an error');
      }, function (e) {
        should.exist(e);
        e.type.should.equal('error');
      });
    });

    it('echoes correctly', function () {
      var obj = {hello: {world: 'yo'}};
      return workerPromise('test/echo-worker.js', obj).then(function (data) {
        data.should.deep.equal(obj);
      });
    });

    it('errors correctly', function () {
      return workerPromise('test/error-worker.js', null).then(function () {
        throw new Error('expected an error');
      }, function (e) {
        e.type.should.equal('error');
        e.message.should.be.a('string');
      });
    });

    it('errors on undefined postMessage()', function () {
      var worker = createWorker('test/echo-worker.js');
      return Promise.resolve().then(function () {
        worker.postMessage();
      }).then(function () {
        throw new Error('expected an error');
      }, function (e) {
        should.exist(e);
        worker.terminate();
      });
    });

    it('emits multiple things', function () {
      var worker = createWorker('test/echo-worker.js');
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
      var worker = createWorker('test/echo-and-error-worker.js');
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

    it('does nothing after termination', function () {
      var worker = createWorker('test/echo-worker.js');
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

    it('error listener inside worker itself', function () {
      var worker = createWorker('test/error-listener-worker.js');
      return new Promise(function (resolve) {

        var count = 0;

        function checkDone() {
          if (++count === 2) {
            resolve();
          }
        }

        worker.addEventListener('message', function (e) {
          e.data.error.should.equal(true);
          checkDone();
        });

        worker.addEventListener('error', function (err) {
          should.exist(err);
          err.type.should.equal('error');
          err.message.should.be.a('string');
          checkDone();
        });

        worker.postMessage({});
      }).then(function () {
        worker.terminate();
      });
    });

    it('multiple listeners', function () {
      var worker = createWorker('test/echo-worker.js');
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
      var worker = createWorker('test/echo-twice-worker.js');
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

  });
});