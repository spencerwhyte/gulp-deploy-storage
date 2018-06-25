const path = require('path');
const crypto = require('crypto');
const Promise = require('bluebird');

function SynchronizableFile(firebaseApp, remotePath, vinyl) {
  this.vinyl = vinyl;
  this.bucket = firebaseApp.storage().bucket();
  this.database = firebaseApp.database();
  const basename = path.basename(vinyl.path);
  const uploadPath = path.join(remotePath, basename);
  this.cloudStorageFile = this.bucket.file(uploadPath);
}

function firebaseEncode(decoded) {
  return decoded.replace(/\./g, '%2E');
}

SynchronizableFile.prototype.updateDatabaseGeneration = function(newGeneration) {
  return new Promise((resolve, reject)=> {
    const databasePath = firebaseEncode(this.cloudStorageFile.name);
    const basename = path.basename(this.vinyl.path);
    this.database.ref(databasePath).set({
      'generation': newGeneration,
      'filename': basename
    }).then(()=> {
      resolve(newGeneration);
    });
  });
}

SynchronizableFile.prototype.fetchMd5Hashes = function() {
  return new Promise((resolve, reject)=> {
    const localMd5 = crypto.createHash('md5');
    localMd5.update(this.vinyl.contents, 'utf8');
    const localMd5Hash = localMd5.digest('base64');
    this.cloudStorageFile.getMetadata().then(function(data) {
      const metadata = data[0];
      const remoteMd5Hash = metadata.md5Hash;
      resolve({'localMd5Hash': localMd5Hash, 'remoteMd5Hash': remoteMd5Hash});
    }).catch(function() {
      resolve({'localMd5Hash': localMd5Hash, 'remoteMd5Hash': null})
    });
  });
}

SynchronizableFile.prototype.fetchDatabaseGeneration = function() {
  return new Promise((resolve, reject)=> {
    const databasePath = firebaseEncode(this.cloudStorageFile.name);
    this.database.ref(databasePath).once('value').then(function(snapshot) {
      if (snapshot.val() != null) {
        resolve(snapshot.val().generation);
      } else {
        resolve(null);
      }
    });
  });
}

SynchronizableFile.prototype.fetchStorageGeneration = function() {
  return this.cloudStorageFile.getMetadata().then((data) => {
    const metadata = data[0];
    const storageGeneration = metadata.generation;
    return Promise.resolve(storageGeneration);
  });
}

SynchronizableFile.prototype.fetchGenerations = function() {
  return this.fetchStorageGeneration().then((storageGeneration) => {
    return this.fetchDatabaseGeneration().then((databaseGeneration) => {
      return Promise.resolve({'databaseGeneration': databaseGeneration, 'storageGeneration': storageGeneration});
    });
  });
}

SynchronizableFile.prototype.upload = function() {
  return new Promise((resolve, reject) => {
    const options = {
      destination: this.cloudStorageFile,
      resumable: false
    };
    this.bucket.upload(this.vinyl.path, options, function(err, newFile) {
      resolve();
    });
  });
}

module.exports = SynchronizableFile;