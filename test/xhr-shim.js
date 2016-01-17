'use strict';

var fs = require('fs');
var path = require('path');

function XHR() {
}

XHR.prototype.open = function (type, script) {
  this.script = script;
};

XHR.prototype.send = function () {
  var that = this;
  process.nextTick(function () {
    if (fs.existsSync(that.script)) {
      that.responseText = fs.readFileSync(that.script, 'utf-8');
      that.status = 200;
    } else {
      that.status = 404;
    }
    that.onload();
  });
};

module.exports = XHR;