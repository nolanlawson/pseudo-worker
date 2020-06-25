'use strict';

var parseDataURL = require("data-urls");

function doEval(self, __pseudoworker_script) {
  /* jshint unused:false */
  (function () {
    /* jshint evil:true */
    eval(__pseudoworker_script);
  }).call(global);
}

function fetchScript(url) {
  if (/^\s*data:/.test(url)) {
    return new Promise(function(resolve, reject) {
      try {
        resolve(parseDataURL(url).body.toString())
      } catch (error) {
        reject(error)
      }
    })
  }

  return fetch(url)
    .then(function(response) {
      return response.text()
    })
}

function PseudoWorker(url) {
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

  function runPostMessage(msg) {
    function callFun(listener) {
      try {
        listener({data: msg});
      } catch (err) {
        postError(err);
      }
    }

    if (workerSelf && typeof workerSelf.onmessage === 'function') {
      callFun(workerSelf.onmessage);
    }
    executeEach(workerMessageListeners, callFun);
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

  fetchScript(url)
    .then(function(text) {
      script = text
      workerSelf = {
        postMessage: workerPostMessage,
        addEventListener: workerAddEventListener,
        close: terminate
      };
      doEval(workerSelf, script);
      var currentListeners = postMessageListeners;
      postMessageListeners = [];
      for (var i = 0; i < currentListeners.length; i++) {
        runPostMessage(currentListeners[i]);
      }
    })
    .catch(function (error) {
      postError(new Error('cannot fetch script: ' + url + ', error: ' + error));
    })

  api.postMessage = postMessage;
  api.addEventListener = addEventListener;
  api.removeEventListener = removeEventListener;
  api.terminate = terminate;

  return api;
}

module.exports = PseudoWorker;
