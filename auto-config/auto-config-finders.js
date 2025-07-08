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

const mc = require('../helpers/mongoDb');
const logger = require('../helpers/logger');

const dbPattern = new RegExp('\/([a-zA-Z0-9_]+)\\?');
const db = process.env.MONGO_URL.match(dbPattern)[1];

class AutoConfigFinders {
  
  /**
   * Find recent test runs based on end time
   * Equivalent to: AutoConfigFinders.kt:14-21
   */
  async findRecentTestRuns(startTime) {
    try {
      const query = {
        end: { $gte: startTime }
      };
      
      return await mc
        .get()
        .db(db)
        .collection('testRuns')
        .find(query)
        .toArray();
    } catch (e) {
      logger.logError(e, 'findRecentTestRuns failed');
      throw e;
    }
  }

  /**
   * Find all profiles
   * Equivalent to: AutoConfigFinders.kt:23-25
   */
  async findProfiles() {
    try {
      return await mc
        .get()
        .db(db)
        .collection('profiles')
        .find({})
        .toArray();
    } catch (e) {
      logger.logError(e, 'findProfiles failed');
      throw e;
    }
  }

  /**
   * Find all auto config grafana dashboards
   * Equivalent to: AutoConfigFinders.kt:27-29
   */
  async findAutoConfigGrafanaDashboards() {
    try {
      return await mc
        .get()
        .db(db)
        .collection('autoConfigGrafanaDashboards')
        .find({})
        .toArray();
    } catch (e) {
      logger.logError(e, 'findAutoConfigGrafanaDashboards failed');
      throw e;
    }
  }

  /**
   * Find grafana dashboard by grafana instance and dashboard UIDs
   * Equivalent to: AutoConfigFinders.kt:40-53
   */
  async findGrafanaDashboardOrNull(grafana, dashboardUids) {
    try {
      const query = {
        grafana: grafana,
        uid: { $in: dashboardUids }
      };
      
      const dashboards = await mc
        .get()
        .db(db)
        .collection('grafanaDashboards')
        .find(query)
        .toArray();
        
      if (dashboards.length === 0) {
        return null;
      }
      
      if (dashboards.length > 1) {
        throw new Error(`Found more than one Grafana dashboard with uid '${dashboardUids}' for Grafana '${grafana}'`);
      }
      
      return dashboards[0];
    } catch (e) {
      logger.logError(e, 'findGrafanaDashboardOrNull failed');
      throw e;
    }
  }

  /**
   * Find grafana dashboard (throws if not found)
   * Equivalent to: AutoConfigFinders.kt:31-34
   */
  async findGrafanaDashboard(grafana, dashboardUids) {
    const dashboard = await this.findGrafanaDashboardOrNull(grafana, dashboardUids);
    if (!dashboard) {
      throw new Error(`Could not find Grafana dashboard with one of uids '${dashboardUids}' for Grafana '${grafana}'`);
    }
    return dashboard;
  }

  /**
   * Find application dashboards for system under test
   * Equivalent to: AutoConfigFinders.kt:55-68
   */
  async findApplicationDashboardsForSystemUnderTest(testRun, grafana, dashboardUid, dashboardLabel = null) {
    try {
      const query = {
        grafana: grafana,
        dashboardUid: dashboardUid,
        application: testRun.application,
        testEnvironment: testRun.testEnvironment
      };
      
      // Include dashboard label if provided (for separate dashboards)
      if (dashboardLabel) {
        query.dashboardLabel = dashboardLabel;
      }
      
      return await mc
        .get()
        .db(db)
        .collection('applicationDashboards')
        .find(query)
        .toArray();
    } catch (e) {
      logger.logError(e, 'findApplicationDashboardsForSystemUnderTest failed');
      throw e;
    }
  }

  /**
   * Find existing grafana dashboards by grafana instance and UIDs
   * Equivalent to: AutoConfigFinders.kt:70-78
   */
  async findExistingGrafanaDashboards(grafana, dashboardUids) {
    try {
      const query = {
        grafana: grafana,
        uid: { $in: dashboardUids }
      };
      
      return await mc
        .get()
        .db(db)
        .collection('grafanaDashboards')
        .find(query)
        .toArray();
    } catch (e) {
      logger.logError(e, 'findExistingGrafanaDashboards failed');
      throw e;
    }
  }

  /**
   * Find grafana configuration by label
   * Equivalent to: AutoConfigFinders.kt:81-88
   */
  async findGrafanaConfiguration(grafana) {
    try {
      const query = {
        label: grafana
      };
      
      const configs = await mc
        .get()
        .db(db)
        .collection('grafanas')
        .find(query)
        .toArray();
        
      if (configs.length === 0) {
        throw new Error(`Grafana configuration not found for: ${grafana}`);
      }
      
      return configs[0];
    } catch (e) {
      logger.logError(e, 'findGrafanaConfiguration failed');
      throw e;
    }
  }

  /**
   * Find all generic checks
   * Equivalent to: AutoConfigFinders.kt:91-93
   */
  async findGenericChecks() {
    try {
      return await mc
        .get()
        .db(db)
        .collection('genericChecks')
        .find({})
        .toArray();
    } catch (e) {
      logger.logError(e, 'findGenericChecks failed');
      throw e;
    }
  }

  /**
   * Find all generic deep links
   * Equivalent to: AutoConfigFinders.kt:95-97
   */
  async findGenericDeepLinks() {
    try {
      return await mc
        .get()
        .db(db)
        .collection('genericDeepLinks')
        .find({})
        .toArray();
    } catch (e) {
      logger.logError(e, 'findGenericDeepLinks failed');
      throw e;
    }
  }

  /**
   * Find all generic report panels
   * Equivalent to: AutoConfigFinders.kt:99-101
   */
  async findGenericReportPanels() {
    try {
      return await mc
        .get()
        .db(db)
        .collection('genericReportPanels')
        .find({})
        .toArray();
    } catch (e) {
      logger.logError(e, 'findGenericReportPanels failed');
      throw e;
    }
  }

  /**
   * Find application dashboards by template dashboard UID
   * Equivalent to: AutoConfigFinders.kt:103-110
   */
  async findApplicationDashboardsByTemplateDashboardUid(dashboardUid, application, testEnvironment) {
    try {
      const query = {
        templateDashboardUid: dashboardUid,
        application: application,
        testEnvironment: testEnvironment
      };
      
      return await mc
        .get()
        .db(db)
        .collection('applicationDashboards')
        .find(query)
        .toArray();
    } catch (e) {
      logger.logError(e, 'findApplicationDashboardsByTemplateDashboardUid failed');
      throw e;
    }
  }

  /**
   * Find benchmark for application dashboard (matching original implementation exactly)
   */
  async findBenchmarkForApplicationDashboardOrNull(applicationDashboard, genericCheckId, testType) {
    try {
      const query = {
        $and: [
          {
            genericCheckId: genericCheckId,
          },
          {
            application: applicationDashboard.application,
          },
          {
            testEnvironment: applicationDashboard.testEnvironment,
          },
          {
            testType: testType,
          },
          {
            dashboardLabel: applicationDashboard.dashboardLabel,
          },
        ],
      };
      
      const benchmark = await mc
        .get()
        .db(db)
        .collection('benchmarks')
        .findOne(query);
        
      return benchmark; // Returns null if not found
    } catch (e) {
      logger.logError(e, 'findBenchmarkForApplicationDashboardOrNull failed');
      throw e;
    }
  }

  /**
   * Find deep link for test run (matching original implementation exactly)
   */
  async findDeepLinkForTestRunOrNull(genericDeepLink, testRun) {
    try {
      const query = {
        $and: [
          {
            genericDeepLinkId: genericDeepLink._id,
          },
          {
            application: testRun.application,
          },
          {
            testEnvironment: testRun.testEnvironment,
          },
          {
            testType: testRun.testType,
          },
        ],
      };
      
      const deepLink = await mc
        .get()
        .db(db)
        .collection('deepLinks')
        .findOne(query);
        
      return deepLink;
    } catch (e) {
      logger.logError(e, 'findDeepLinkForTestRunOrNull failed');
      throw e;
    }
  }

  /**
   * Find report panel for application dashboard (matching original implementation exactly)
   */
  async findReportPanelForApplicationDashboardOrNull(applicationDashboard, genericReportPanelId, testType) {
    try {
      const query = {
        $and: [
          {
            genericReportPanelId: genericReportPanelId,
          },
          {
            application: applicationDashboard.application,
          },
          {
            testEnvironment: applicationDashboard.testEnvironment,
          },
          {
            dashboardUid: applicationDashboard.dashboardUid,
          },
          {
            dashboardLabel: applicationDashboard.dashboardLabel,
          },
          {
            testType: testType,
          },
        ],
      };
      
      const panel = await mc
        .get()
        .db(db)
        .collection('reportPanels')
        .findOne(query);
        
      return panel; // Returns null if not found
    } catch (e) {
      logger.logError(e, 'findReportPanelForApplicationDashboardOrNull failed');
      throw e;
    }
  }
}

module.exports = AutoConfigFinders;