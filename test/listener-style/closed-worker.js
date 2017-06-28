'use strict';


self.addEventListener('message', function () {
  self.close();

  self.postMessage({
    hello: 'world'
  });
});
