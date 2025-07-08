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
  getAllBenchmarks,
  getGrafanaDashboardByUid,
  updateBenchmark,
  getTestRunsForExpiry,
  expireTestRun,
  removeSnapshotsByTestRunId,
  getApplicationByName,
  getConfigurationByTypeAndKey,
} = require('../helpers/perfana-mongo');
const { grafanaApiGet } = require('../helpers/grafana-api');

// Valid panel types for SLI (based on PanelType enum)
const VALID_PANEL_TYPES = [
  'graph',
  'timeseries', 
  'stat',
  'gauge',
  'table',
  'singlestat',
  'bargauge',
  'piechart',
  'heatmap',
  'flamegraph'
];

class SanityChecker {
  constructor(config) {
    this.enabled = config.enabled !== false; // default to true
  }

  /**
   * Check SLI/SLO sanity - equivalent to SanityChecker.kt:checkSliSloSanity()
   */
  async checkSliSloSanity() {
    if (!this.enabled) {
      logger.debug('SanityChecker is disabled, skipping SLI/SLO sanity check');
      return;
    }

    logger.info('Start SliSlo sanity check');

    let countDashboardsNotFound = 0;
    let countPanelNotFound = 0;
    let countInvalidPanelType = 0;

    try {
      // Loop through all benchmarks (SLIs) and check if they are still valid
      const benchmarks = await getAllBenchmarks();
      
      for (const benchmark of benchmarks) {
        try {
          logger.debug(
            `SliSlo sanity check for benchmark: ${benchmark.testEnvironment} ${benchmark.testType} '${benchmark.panel?.title}'`
          );

          // Find the Grafana dashboard
          const grafanaDashboard = await getGrafanaDashboardByUid(
            benchmark.grafana,
            benchmark.dashboardUid
          );

          if (!grafanaDashboard) {
            countDashboardsNotFound++;
            logger.warn(`Dashboard with uid '${benchmark.dashboardUid}' not found`);
            
            benchmark.valid = false;
            benchmark.reasonNotValid = 
              `Dashboard '${benchmark.dashboardLabel}' with uid '${benchmark.dashboardUid}' does not exist. ` +
              'Please select existing dashboard for this SLI.';
          } else {
            // Check if panel exists
            const panelId = benchmark.panel?.id;
            logger.debug(
              `Check panel id: ${panelId} for dashboard: ${benchmark.dashboardLabel} with uid: ${benchmark.dashboardUid}`
            );

            const grafanaDashboardPanel = grafanaDashboard.panels?.find(
              panel => panel.id === panelId
            );

            if (!grafanaDashboardPanel) {
              countPanelNotFound++;
              logger.warn(
                `Panel with id ${panelId} not found in dashboard '${benchmark.dashboardLabel}' with uid '${benchmark.dashboardUid}'`
              );
              
              benchmark.valid = false;
              benchmark.reasonNotValid = 
                `Panel '${benchmark.panel?.title}' with id '${panelId}' ` +
                `does not exist in dashboard '${benchmark.dashboardLabel}' with uid '${benchmark.dashboardUid}'. ` +
                'Please select existing panel for this SLI';
            } else {
              logger.debug(`Panel found: ${panelId} - ${grafanaDashboardPanel.title}`);
              
              if (!this.isValidPanelType(grafanaDashboardPanel.type)) {
                countInvalidPanelType++;
                benchmark.valid = false;
                benchmark.reasonNotValid = 
                  `Panel '${grafanaDashboardPanel.title}' with id '${panelId}' ` +
                  `has type '${grafanaDashboardPanel.type}' which is not a valid panel type for SLI. ` +
                  'Please select a valid panel type for this SLI.';
              } else {
                benchmark.valid = true;
                benchmark.reasonNotValid = '';
              }
            }
          }

          if (!benchmark.valid) {
            logger.warn(
              `Benchmark for test environment: '${benchmark.testEnvironment}' and testType: '${benchmark.testType}' and SUT: '${benchmark.application}' ` +
              `is not valid: '${benchmark.reasonNotValid}'`
            );
            await updateBenchmark(benchmark);
          }
        } catch (error) {
          logger.error(`Error during SliSlo sanity check for benchmark: '${benchmark.panel?.title}'`, error);
        }
      }

      logger.info(
        `SliSlo sanity check finished. Dashboards not found: ${countDashboardsNotFound} ` +
        `Panels not found: ${countPanelNotFound} Invalid panel types: ${countInvalidPanelType}`
      );
    } catch (error) {
      logger.logError(error, 'Error in checkSliSloSanity');
    }
  }

  /**
   * Check if panel type is valid for SLI
   * Equivalent to SanityChecker.kt:isValidPanelType()
   */
  isValidPanelType(type) {
    if (!type || type === 'unknown') {
      return false;
    }
    return VALID_PANEL_TYPES.includes(type);
  }


  /**
   * Expire old test runs based on retention policy
   * Equivalent to SanityChecker.kt:expireTestRuns()
   */
  async expireTestRuns() {
    if (!this.enabled) {
      logger.debug('SanityChecker is disabled, skipping test run expiry');
      return;
    }

    logger.info('Starting test run expiry job...');

    try {
      // Get grafana retention configuration
      const snapshotExpiresConfig = await getConfigurationByTypeAndKey('datasource', 'grafanaRetention');
      
      if (!snapshotExpiresConfig) {
        logger.warn('No grafanaRetention configuration found, skipping test run expiry');
        return;
      }

      const expiryPeriodSeconds = parseInt(snapshotExpiresConfig.value);
      const expiryDate = new Date(Date.now() - expiryPeriodSeconds * 1000);

      logger.info(`Expiry date: ${expiryDate.toISOString()}`);

      const expiredTestRuns = await getTestRunsForExpiry(expiryDate);
      
      logger.info(`Found ${expiredTestRuns.length} test runs to expire.`);
      logger.info(`The expired test runs: ${expiredTestRuns.map(tr => `${tr._id} ${tr.testRunId}`)}`);

      for (const testRun of expiredTestRuns) {
        try {
          logger.info(
            `Expiring test run: ${testRun._id} with end date: ${testRun.end} and expiry date: ${expiryDate.toISOString()}`
          );
          
          // Expire the test run
          await expireTestRun(testRun._id);
          
          // Remove snapshot references
          await this.removeSnapshotReferences(testRun);
          
          // Remove test run baselines from application
          const application = await getApplicationByName(testRun.application);
          if (application) {
            await this.removeTestRunBaselinesFromApplication(application, testRun);
          }
        } catch (error) {
          logger.error(`Error expiring test run ${testRun.testRunId}: ${error.message}`);
        }
      }
    } catch (error) {
      logger.logError(error, 'Error in expireTestRuns');
    }
  }

  /**
   * Remove snapshot references for expired test run
   * Equivalent to SanityChecker.kt:removeSnapshotReferences()
   */
  async removeSnapshotReferences(testRun) {
    try {
      // Note that snapshots in grafana are already expired by the grafana retention policy
      const deleteResult = await removeSnapshotsByTestRunId(testRun.testRunId);
      
      logger.info(`Deleted ${deleteResult.deletedCount} snapshots in mongo for test run: ${testRun.testRunId}`);
    } catch (error) {
      logger.error(`Error removing snapshot references for ${testRun.testRunId}: ${error.message}`);
    }
  }

  /**
   * Remove test run baselines from application configuration
   * Equivalent to SanityChecker.kt:removeTestRunBaselinesFromApplication()
   */
  async removeTestRunBaselinesFromApplication(application, testRun) {
    logger.info(`Check if test run is used as baseline for application: ${application.name}`);
    
    const testRunId = testRun.testRunId;
    
    try {
      // Find test types that use this test run as baseline
      const testTypes = [];
      
      if (application.testEnvironments) {
        for (const testEnv of application.testEnvironments) {
          if (testEnv.name === testRun.testEnvironment && testEnv.testTypes) {
            for (const testType of testEnv.testTypes) {
              if (testType.name === testRun.testType && testType.baselineTestRun === testRunId) {
                testTypes.push(testType);
              }
            }
          }
        }
      }

      if (testTypes.length > 1) {
        logger.warn(`Unexpected: found that ${testRunId} is set as baseline for multiple application (${testTypes.length}).`);
      }

      for (const testType of testTypes) {
        logger.info(
          `Removing baseline test run: ${testRunId} from application: ${application.name} ` +
          `for test environment: ${testRun.testEnvironment} and workload: ${testRun.testType}`
        );
        
        // This would need to call the application engine to update the baseline
        // For now, just log what would be done
        logger.info(`Would update application baseline for ${application.name}, ${testRun.testEnvironment}, ${testType.name} to null`);
      }
    } catch (error) {
      logger.error(`Error removing baselines for application ${application.name}: ${error.message}`);
    }
  }
}

module.exports = SanityChecker;