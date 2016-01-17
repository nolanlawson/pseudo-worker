'use strict';

var should = require('chai').should();
var Promise = require('pouchdb-promise');

var PseudoWorker = require('../lib');

['pseudoworker', 'worker'].forEach(function (workerType) {

  describe(workerType + ' test suite', function () {

    this.timeout(10000);

    function workerPromise(script, toSend) {
      var worker;
      return Promise.resolve().then(function () {
        worker = workerType === 'worker' ?
          new Worker(script) : new PseudoWorker(script);
      }).then(function () {
        return new Promise(function (resolve, reject) {
          worker.addEventListener('message', function (e) {
            resolve(e.data);
            worker.terminate();
          });
          worker.addEventListener('error', function (e) {
            reject(e);
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
      })
    });

  });
});