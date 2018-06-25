const map = require('map-stream');
const FileSynchronizer = require('./file-synchronizer.js');

exports.deploy = function(firebaseApp, remotePath) {
  return map((file, cb) => {
    const fileSynchronizer = new FileSynchronizer(firebaseApp, remotePath, file);
    fileSynchronizer.synchronize().then(function() {
      cb(null, file);
    });
  });
}