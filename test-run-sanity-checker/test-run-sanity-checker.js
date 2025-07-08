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

const logger = require('../helpers/logger');
const {
  findTestRunsInProgressOlderThan,
  updateTestRunStatusToError,
  updateReasonsNotValid,
} = require('../helpers/perfana-mongo');

class TestRunSanityChecker {
  constructor(config) {
    this.delayInMinutes = config.delayInMinutes || 10;
    this.enabled = config.enabled !== false; // default to true
  }

  /**
   * Remove blocked test runs - equivalent to TestRunSanityChecker.kt:removeBlockedTestRuns()
   */
  async removeBlockedTestRuns() {
    if (!this.enabled) {
      logger.debug('TestRunSanityChecker is disabled, skipping...');
      return;
    }

    logger.info(
      `Start check for test runs that are not in end state after ${this.delayInMinutes} minutes`,
    );

    const overdueDateTime = new Date(
      Date.now() - this.delayInMinutes * 60 * 1000,
    );
    logger.debug(
      `Searching test run in progress older than ${overdueDateTime.toISOString()}`,
    );

    try {
      const testRuns = await findTestRunsInProgressOlderThan(overdueDateTime);
      logger.info(
        `Found ${testRuns.length} test runs that are not in end state after ${this.delayInMinutes} minutes`,
      );

      if (testRuns.length === 0) {
        return;
      }

      // Update test run status to error
      const results = await updateTestRunStatusToError(
        testRuns.map((tr) => tr.id),
      );

      // Add validation reason for each test run
      const message = `Invalid: no result after waiting ${this.delayInMinutes} minutes for analysis to finish.`;
      for (const testRun of testRuns) {
        try {
          await updateReasonsNotValid(testRun.testRunId, [message]);
        } catch (error) {
          logger.error(
            `Failed to update reasons not valid for test run ${testRun.testRunId}: ${error.message}`,
          );
        }
      }

      logger.info(
        `Made ${results.modifiedCount || testRuns.length} test runs invalid because of overdue results`,
      );
    } catch (error) {
      logger.logError(error, 'Error in removeBlockedTestRuns');
    }
  }
}

module.exports = TestRunSanityChecker;
