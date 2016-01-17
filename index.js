'use strict';

function PseudoWorker(script) {
  this.__messageListeners = [];
  this.__errorListeners = [];
  this.__postMessageListeners = [];

  var that = this;

  var xhr = new XMLHttpRequest();
  xhr.open('GET', script, true);

  xhr.onload = function () {
    if (xhr.status >= 200 && xhr.status < 400) {
      var data = xhr.responseText;
      that.__scriptData = data;
      var self = {
        __messageListeners: [],
        postMessage: function (msg) {
          that.__messageListeners.forEach(function(listener) {
            listener({
              data: msg
            });
          });
        },
        addEventListener: function (type, fun) {
          if (type === 'message') {
            self.__messageListeners.push(fun);
          }
        }
      };
      (function () {
        /* jshint evil:true */
        eval(that.__scriptData);
      }).call(window);
      that.__workerSelf = self;
      while (that.__postMessageListeners.length) {
        that.__runPostMessage(that.__postMessageListeners.pop());
      }
    } else {
      that.__postError(new Error('cannot find script ' + script));
    }
  };

  xhr.send();
}

PseudoWorker.prototype.addEventListener = function(type, fun) {
  var that = this;
  if (type === 'message') {
    that.__messageListeners.push(fun);
  } else if (type === 'error') {
    that.__errorListeners.push(fun);
  }
};

PseudoWorker.prototype.postMessage = function(msg) {
  var that = this;

  if (typeof msg === 'undefined') {
    throw new Error('postMessage() requires an argument');
  }
  if (that.__terminated) {
    return;
  }
  if (!that.__scriptData) {
    that.__postMessageListeners.push(msg);
    return;
  }
  that.__runPostMessage(msg);
};

PseudoWorker.prototype.terminate = function () {
  var that = this;
  that.__terminated = true;
};

PseudoWorker.prototype.__runPostMessage = function (msg) {
  var that = this;
  that.__workerSelf.__messageListeners.forEach(function (listener) {
    try {
      listener({data: msg});
    } catch (err) {
      that.__postError(err);
    }
  });
};

PseudoWorker.prototype.__postError = function (err) {
  var that = this;
  that.__errorListeners.forEach(function (listener) {
    listener({
      type: 'error',
      error: err,
      message: err.message
    });
  });
};

module.exports = PseudoWorker;