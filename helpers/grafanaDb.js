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

const mysql = require('mysql');
const { Client } = require('pg');
const logger = require('./logger');

let connection;

if (
  process.env.MYSQL_HOST &&
  process.env.MYSQL_USER &&
  process.env.MYSQL_PASSWORD
) {
  connection = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: 'grafana',
  });
} else if (
  process.env.PG_HOST &&
  process.env.PG_USER &&
  process.env.PG_PASSWORD &&
  process.env.PG_PORT
) {
  connection = new Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE ? process.env.PG_DATABASE : 'grafana',
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
    ssl: process.env.PG_SSL === 'true',
  });
} else {
  logger.error('Grafana database configuration is incorrect!');
  process.exit();
}

connection.connect((err) => {
  if (err) {
    logger.error(`Failed to connect to the Grafana database: ${err}`);
    process.exit();
  }
});

module.exports.get = () => {
  if (!connection) {
    throw new Error('Call connect first!');
  }

  return connection;
};
