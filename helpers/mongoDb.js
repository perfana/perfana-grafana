/**
 * Copyright 2025 Perfana Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { MongoClient } = require('mongodb');
const logger = require('./logger');

// Options for MongoDB connection
const options = {};

const url = process.env.MONGO_URL;

let connection = null;

module.exports.connect = async () => {
  try {
    if (!connection) {
      // Create client first with the new pattern
      const client = new MongoClient(url, options);
      // Then connect
      await client.connect();
      connection = client;
    }
    return connection;
  } catch (err) {
    logger.error('Failed to connect to MongoDB:', err);
    throw err;
  }
};

module.exports.get = () => {
  if (!connection) {
    throw new Error('Call connect first!');
  }

  return connection;
};
