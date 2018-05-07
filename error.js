/*Cite:https://github.com/googleapis/nodejs-datastore/blob/master/samples/error.js*/

'use strict';

const Datastore = require('@google-cloud/datastore');

// [START error]
function runQuery() {
  // Creates a client
  const datastore = new Datastore({});

  const query = datastore.createQuery(['Company']).start('badrequest');

  return datastore
    .runQuery(query)
    .then(results => {
      const entities = results[0];
      console.log('Entities:');
      entities.forEach(entity => console.log(entity));
      return entities;
    })
    .catch(err => {
      console.log(err.errors); // [...]
      console.log(err.code); // 3 (a gRPC error code)
      console.log(err.message); // "Bad Request"
      console.log(err.response); // {...}

      // Process error

      // For example, treat permission error like no entities were found
      // eslint-disable-next-line no-constant-condition
      if (/* some condition */ false) {
        return [];
      }

      // Forward the error to the caller
      return Promise.reject(err);
    });
}
// [END error]

exports.runQuery = runQuery;

if (module === require.main) {
  exports.runQuery();
}