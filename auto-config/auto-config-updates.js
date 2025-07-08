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
const Random = require('meteor-random');

const dbPattern = new RegExp('\/([a-zA-Z0-9_]+)\\?');
const db = process.env.MONGO_URL.match(dbPattern)[1];

class AutoConfigUpdates {
  /**
   * Insert application dashboard
   */
  async insertApplicationDashboard(applicationDashboard) {
    try {
      return await mc
        .get()
        .db(db)
        .collection('applicationDashboards')
        .insertOne(applicationDashboard);
    } catch (e) {
      logger.logError(e, 'upsertApplicationDashboard failed');
      throw e;
    }
  }

  /**
   * Update application dashboard variables
   */
  async updateApplicationDashboardVariables(applicationDashboard) {
    try {
      return await mc
        .get()
        .db(db)
        .collection('applicationDashboards')
        .updateOne(
          {
            _id: applicationDashboard._id || applicationDashboard.id,
          },
          {
            $set: {
              variables: applicationDashboard.variables,
            },
          },
        );
    } catch (e) {
      logger.logError(e, 'updateApplicationDashboardVariables failed');
      throw e;
    }
  }

  /**
   * Upsert grafana dashboard
   */
  async upsertGrafanaDashboard(grafanaDashboard) {
    try {
      return await mc
        .get()
        .db(db)
        .collection('grafanaDashboards')
        .findOneAndUpdate(
          {
            grafana: grafanaDashboard.grafana,
            uid: grafanaDashboard.uid,
          },
          {
            $set: grafanaDashboard,
          },
          {
            upsert: true,
            returnOriginal: false,
          },
        );
    } catch (e) {
      logger.logError(e, 'upsertGrafanaDashboard failed');
      throw e;
    }
  }

  /**
   * Update template dashboard's usedBySUT field
   */
  async updateUsedBySut(templateDashboard, application) {
    try {
      // Add application to usedBySUT array if not already present
      return await mc
        .get()
        .db(db)
        .collection('grafanaDashboards')
        .updateOne(
          {
            _id: templateDashboard._id,
          },
          {
            $addToSet: {
              usedBySUT: application,
            },
          },
        );
    } catch (e) {
      logger.logError(e, 'updateUsedBySut failed');
      throw e;
    }
  }

  /**
   * Insert benchmark based on generic check (matching original implementation exactly)
   */
  async insertBenchmarkBasedOnGenericCheck(
    genericCheck,
    testRun,
    applicationDashboard,
  ) {
    try {
      const benchmark = {
        _id: Random.secret(),
        application: testRun.application,
        testEnvironment: testRun.testEnvironment,
        testType: testRun.testType,
        grafana: applicationDashboard.grafana,
        dashboardLabel: applicationDashboard.dashboardLabel,
        dashboardId: applicationDashboard.dashboardId,
        dashboardUid: applicationDashboard.dashboardUid,
        panel: genericCheck.panel,
        genericCheckId: genericCheck.checkId,
      };

      return await mc
        .get()
        .db(db)
        .collection('benchmarks')
        .insertOne(benchmark);
    } catch (e) {
      logger.logError(e, 'insertBenchmarkBasedOnGenericCheck failed');
      throw e;
    }
  }

  /**
   * Insert deep link based on generic deep link (matching original implementation exactly)
   */
  async insertDeepLinkBasedOnGenericDeepLink(genericDeepLink, testRun) {
    try {
      const deepLink = {
        _id: Random.id(),
        application: testRun.application,
        testEnvironment: testRun.testEnvironment,
        testType: testRun.testType,
        name: genericDeepLink.name,
        url: genericDeepLink.url,
        genericDeepLinkId: genericDeepLink._id,
      };

      return await mc.get().db(db).collection('deepLinks').insertOne(deepLink);
    } catch (e) {
      logger.logError(e, 'insertDeepLinkBasedOnGenericDeepLink failed');
      throw e;
    }
  }

  /**
   * Insert report panel based on generic report panel (matching original implementation exactly)
   */
  async insertReportPanelBasedOnGenericReportPanel(
    genericReportPanel,
    testRun,
    applicationDashboard,
    index,
  ) {
    try {
      const reportPanel = {
        _id: Random.secret(),
        application: testRun.application,
        testEnvironment: testRun.testEnvironment,
        testType: testRun.testType,
        grafana: applicationDashboard.grafana,
        dashboardLabel: applicationDashboard.dashboardLabel,
        dashboardId: applicationDashboard.dashboardId,
        dashboardUid: applicationDashboard.dashboardUid,
        panel: genericReportPanel.panel,
        index: index,
        genericReportPanelId: genericReportPanel.reportPanelId,
      };

      return await mc
        .get()
        .db(db)
        .collection('reportPanels')
        .insertOne(reportPanel);
    } catch (e) {
      logger.logError(e, 'insertReportPanelBasedOnGenericReportPanel failed');
      throw e;
    }
  }
}

module.exports = AutoConfigUpdates;
