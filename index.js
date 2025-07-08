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

const logger = require('./helpers/logger');

const {
  updateVersion,
  getGrafanaInstances,
} = require('./helpers/perfana-mongo');

const grafanaSync = require('./grafana-sync/grafana-sync');
const { sync, testRunSanityChecker, sanityChecker } = require('./config/default');
const TestRunSanityChecker = require('./test-run-sanity-checker/test-run-sanity-checker');
const SanityChecker = require('./sanity-checker/sanity-checker');

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

// debug('Configuration for [%s] %Y', config.env, config.util.toObject(config))

const db = require('./helpers/mongoDb');

// Initialize TestRunSanityChecker and SanityChecker
const testRunSanityChecker_instance = new TestRunSanityChecker(testRunSanityChecker);
const sanityChecker_instance = new SanityChecker(sanityChecker);

const main = async () => {
  try {
    await db.connect();
    logger.logDatabase('connection', true);
    startSync();
    startTestRunSanityChecker();
    startSanityChecker();
  } catch (e) {
    logger.error('Database connection failed - exiting application', e);
    // Always hard exit on a database connection error
    process.exit(1);
  }
};

const startSync = () => {
  setTimeout(async () => {
    try {
      const grafanaInstances = await getGrafanaInstances();
      if (grafanaInstances.length > 0) {
        try {
          await grafanaSync();
          startSync();
        } catch (err) {
          logger.logError(err, 'Grafana sync cycle');
          startSync();
        }
      } else {
        logger.warn(
          `No Grafana instances found in database, retrying in ${process.env.SYNC_INTERVAL || sync.interval} ms`,
        );
        startSync();
      }
    } catch (err) {
      logger.logError(err, 'Failed to get Grafana instances from database');
      startSync();
    }
  }, process.env.SYNC_INTERVAL || sync.interval);
};

const startTestRunSanityChecker = () => {
  if (!testRunSanityChecker.enabled) {
    logger.info('TestRunSanityChecker is disabled, not starting');
    return;
  }

  logger.info(
    `Starting TestRunSanityChecker with ${testRunSanityChecker.delayInMinutes} minute delay, running every ${testRunSanityChecker.interval / 1000} seconds`,
  );

  setTimeout(async () => {
    try {
      await testRunSanityChecker_instance.removeBlockedTestRuns();
    } catch (err) {
      logger.logError(err, 'TestRunSanityChecker cycle failed');
    }
    startTestRunSanityChecker(); // Schedule next run
  }, testRunSanityChecker.interval);
};

const startSanityChecker = () => {
  if (!sanityChecker.enabled) {
    logger.info('SanityChecker is disabled, not starting');
    return;
  }

  logger.info(
    `Starting SanityChecker, running every ${sanityChecker.interval / 1000} seconds`,
  );

  setTimeout(async () => {
    try {
      await sanityChecker_instance.checkSliSloSanity();
      await sanityChecker_instance.expireTestRuns();
    } catch (err) {
      logger.logError(err, 'SanityChecker cycle failed');
    }
    startSanityChecker(); // Schedule next run
  }, sanityChecker.interval);
};

main();
