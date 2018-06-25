const path = require('path');
const log = require('fancy-log');
const chalk = require('chalk');
const SynchronizableFile = require('./synchronizable-file.js');

function FileSynchronizer(firebaseApp, remotePath, vinyl) {
  this.file = new SynchronizableFile(firebaseApp, remotePath, vinyl)
}

FileSynchronizer.prototype.synchronize = function() {
  return this.file.fetchMd5Hashes().then((md5Hashes) => {
    if (md5Hashes.localMd5Hash != md5Hashes.remoteMd5Hash) {
      return this.synchronizeNewFileContents(md5Hashes);
    } else {
      return this.synchronizeNewFileGeneration(md5Hashes);
    }
  });
};

FileSynchronizer.prototype.synchronizeNewFileContents = function(md5Hashes) {
  return this.file.upload().then(()=>{
    return this.file.fetchGenerations().then((generations) => {
      return this.file.updateDatabaseGeneration(generations.storageGeneration).then((generation)=>{
        log(chalk.green(generations.databaseGeneration + " -> " + generation + " " + path.basename(this.file.vinyl.path) + " (" + md5Hashes.remoteMd5Hash + " -> " + md5Hashes.localMd5Hash + ")"));
      });
    });
  });
}

FileSynchronizer.prototype.synchronizeNewFileGeneration = function(md5Hashes) {
  return this.file.fetchGenerations().then((generations) => {
    if (generations.storageGeneration != generations.databaseGeneration) {
      return this.file.updateDatabaseGeneration(generations.storageGeneration).then((generation)=>{
        log(chalk.green(generations.databaseGeneration + " -> " + generations.storageGeneration + " " + path.basename(this.file.vinyl.path)));
      });
    } else {
      log(chalk.gray(generations.databaseGeneration + " " + path.basename(this.file.vinyl.path)));
    }
  });
}

module.exports = FileSynchronizer;