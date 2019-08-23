'use strict';

function doEval(self, __pseudoworker_script) {
  /* jshint unused:false */
  (function () {
    /* jshint evil:true */
    eval(__pseudoworker_script);
  }).call(global);
}

function PseudoWorker(path) {
  var messageListeners = [];
  var errorListeners = [];
  var workerMessageListeners = [];
  var workerErrorListeners = [];
  var postMessageListeners = [];
  var terminated = false;
  var script;
  var workerSelf;

  var api = this;

  // custom each loop is for IE8 support
  function executeEach(arr, fun) {
    var i = -1;
    while (++i < arr.length) {
      if (arr[i]) {
        fun(arr[i]);
      }
    }
  }

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

  function removeEventListener(type, fun) {
      var listeners;
      /* istanbul ignore else */
      if (type === 'message') {
        listeners = messageListeners;
      } else if (type === 'error') {
        listeners = errorListeners;
      } else {
        return;
      }
      var i = -1;
      while (++i < listeners.length) {
        var listener = listeners[i];
        if (listener === fun) {
          delete listeners[i];
          break;
        }
      }
  }

  function postError(err) {
    var callFun = callErrorListener(err);
    if (typeof api.onerror === 'function') {
      callFun(api.onerror);
    }
    if (workerSelf && typeof workerSelf.onerror === 'function') {
      callFun(workerSelf.onerror);
    }
    executeEach(errorListeners, callFun);
    executeEach(workerErrorListeners, callFun);
  }

  function runPostMessage(msg, transfer) {
    function callFun(listener) {
      try {
        listener({data: msg, ports: transfer});
      } catch (err) {
        postError(err);
      }
    }
    if (workerSelf && typeof workerSelf.onmessage === 'function') {
      callFun(workerSelf.onmessage);
    }
    executeEach(workerMessageListeners, callFun);
  }

  function postMessage(msg, transfer) {
    if (typeof msg === 'undefined') {
      throw new Error('postMessage() requires an argument');
    }
    if (terminated) {
      return;
    }
    if (!script) {
      postMessageListeners.push({msg: msg, transfer: (transfer ? transfer : undefined)});
      return;
    }
    runPostMessage(msg, transfer);
  }

  function terminate() {
    terminated = true;
  }

  function workerPostMessage(msg) {
    if (terminated) {
      return;
    }
    function callFun(listener) {
      listener({
        data: msg
      });
    }
    if (typeof api.onmessage === 'function') {
      callFun(api.onmessage);
    }
    executeEach(messageListeners, callFun);
  }

  function workerAddEventListener(type, fun) {
    /* istanbul ignore else */
    if (type === 'message') {
      workerMessageListeners.push(fun);
    } else if (type === 'error') {
      workerErrorListeners.push(fun);
    }
  }

  var xhr = new XMLHttpRequest();

  xhr.open('GET', path);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status >= 200 && xhr.status < 400) {
        script = xhr.responseText;
        workerSelf = {
          postMessage: workerPostMessage,
          addEventListener: workerAddEventListener,
          close: terminate
        };
        doEval(workerSelf, script);
        var currentListeners = postMessageListeners;
        postMessageListeners = [];
        for (var i = 0; i < currentListeners.length; i++) {
          runPostMessage(currentListeners[i].msg, currentListeners[i].transfer);
        }
      } else {
        postError(new Error('cannot find script ' + path));
      }
    }
  };

  xhr.send();

  api.postMessage = postMessage;
  api.addEventListener = addEventListener;
  api.removeEventListener = removeEventListener;
  api.terminate = terminate;

  return api;
}

module.exports = PseudoWorker;
