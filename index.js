'use strict';

function doEval(self, __pseudoworker_script) {
  /* jshint unused:false */
  (function () {
    /* jshint evil:true */
    eval(__pseudoworker_script);
  }).call(window);
}

function PseudoWorker(path) {
  var messageListeners = [];
  var errorListeners = [];
  var workerMessageListeners = [];
  var workerErrorListeners = [];
  var postMessageListeners = [];
  var terminated = false;
  var script;

  function callErrorListener(err) {
    return function (listener) {
      listener({
        type: 'error',
        error: err,
        message: err.message
      });
    };
  }

  function addEventListener(type, fun) {
    /* istanbul ignore else */
    if (type === 'message') {
      messageListeners.push(fun);
    } else if (type === 'error') {
      errorListeners.push(fun);
    }
  }

  function postError(err) {
    var fun = callErrorListener(err);
    errorListeners.forEach(fun);
    workerErrorListeners.forEach(fun);
  }

  function runPostMessage(msg) {
    workerMessageListeners.forEach(function (listener) {
      try {
        listener({data: msg});
      } catch (err) {
        postError(err);
      }
    });
  }

  function postMessage(msg) {
    if (typeof msg === 'undefined') {
      throw new Error('postMessage() requires an argument');
    }
    if (terminated) {
      return;
    }
    if (!script) {
      postMessageListeners.push(msg);
      return;
    }
    runPostMessage(msg);
  }

  function terminate() {
    terminated = true;
  }

  function workerPostMessage(msg) {
    messageListeners.forEach(function(listener) {
      listener({
        data: msg
      });
    });
  }

  function workerAddEventListener(type, fun) {
    /* istanbul ignore else */
    if (type === 'message') {
      workerMessageListeners.push(fun);
    } else if (type === 'error') {
      workerErrorListeners.push(fun);
    }
  }

  function onLoad() {
    var self = {
      postMessage: workerPostMessage,
      addEventListener: workerAddEventListener,
    };
    doEval(self, script);
    while (postMessageListeners.length) {
      runPostMessage(postMessageListeners.pop());
    }
  }

  function doXHR() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', path, true);
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 400) {
        script = xhr.responseText;
        onLoad();
      } else {
        postError(new Error('cannot find script ' + script));
      }
    };
    xhr.send();
  }

  doXHR();

  this.postMessage = postMessage;
  this.addEventListener = addEventListener;
  this.terminate = terminate;

  return this;
}

module.exports = PseudoWorker;