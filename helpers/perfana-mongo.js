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

// noinspection JSUnresolvedReference

const _ = require('lodash');
const Random = require('meteor-random');
const logger = require('./logger');

const mc = require('./mongoDb');

const path = require('path');
const fs = require('fs');

const { createDashboardUid } = require('./utils');

const dbPattern = new RegExp('\/([a-zA-Z0-9_]+)\\?');

if (!process.env.MONGO_URL) {
  logger.error(
    'MONGO_URL environment variable not set! Exiting application ...',
  );
  process.exit(1);
}

const db = process.env.MONGO_URL.match(dbPattern)[1];

if (!db) {
  logger.error(
    'Database name could not be parsed from connection string! Exiting application ...',
  );
  process.exit(1);
}

module.exports.getGrafanaInstances = async () => {
  try {
    return await mc.get().db(db).collection('grafanas').find({}).toArray();
  } catch (e) {
    logger.logError(e, 'getGrafanaInstances');
    throw e;
  }
};

module.exports.upsertGrafanaInstance = async (grafana) => {
  try {
    return await mc.get().db(db).collection('grafanas').findOneAndUpdate(
      {
        _id: grafana._id,
      },
      {
        $set: grafana,
      },
      {
        upsert: true,
        returnOriginal: false,
      },
    );
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getGrafanaInstance = async (label) => {
  try {
    return await mc.get().db(db).collection('grafanas').findOne({
      label: label,
    });
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getGrafanaDashboardsForGrafanaInstance = async (
  grafanaInstanceLabel,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('grafanaDashboards')
      .find({
        grafana: grafanaInstanceLabel,
      })
      .toArray();
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.updateGrafanaLabel = async (grafanaInstanceLabel) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('grafanas')
      .updateOne(
        {
          label: grafanaInstanceLabel,
        },
        {
          $set: {
            label: 'Default',
          },
        },
      );
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.updateGrafanaDashboardsGrafanaLabel = async (
  grafanaInstanceLabel,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('grafanaDashboards')
      .updateMany(
        {
          grafana: grafanaInstanceLabel,
        },
        {
          $set: {
            grafana: 'Default',
          },
        },
      );
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.updateapplicationDashboardsGrafanaLabel = async (
  grafanaInstanceLabel,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('applicationDashboards')
      .updateMany(
        {
          grafana: grafanaInstanceLabel,
        },
        {
          $set: {
            grafana: 'Default',
          },
        },
      );
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.updateAutoConfigGrafanaDashboardsGrafanaLabel = async (
  grafanaInstanceLabel,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('autoConfigGrafanaDashboards')
      .updateMany(
        {
          grafana: grafanaInstanceLabel,
        },
        {
          $set: {
            grafana: 'Default',
          },
        },
      );
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.updateGenericChecksGrafanaLabel = async (
  grafanaInstanceLabel,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('genericChecks')
      .updateMany(
        {
          grafana: grafanaInstanceLabel,
        },
        {
          $set: {
            grafana: 'Default',
          },
        },
      );
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.updateGenericReportPanelsGrafanaLabel = async (
  grafanaInstanceLabel,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('genericReportPanels')
      .updateMany(
        {
          grafana: grafanaInstanceLabel,
        },
        {
          $set: {
            grafana: 'Default',
          },
        },
      );
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.updateReportPanelsGrafanaLabel = async (
  grafanaInstanceLabel,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('reportPanels')
      .updateMany(
        {
          grafana: grafanaInstanceLabel,
        },
        {
          $set: {
            grafana: 'Default',
          },
        },
      );
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getTemplateGrafanaDashboardInstancesForGrafanaInstance = async (
  grafanaInstanceLabel,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('applicationDashboards')
      .find({
        grafana: grafanaInstanceLabel,
        isTemplate: true,
      })
      .toArray();
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getApplicationDashboardsByUid = async (uid) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('applicationDashboards')
      .findOne({ uid: uid });
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getApplicationDashboardsByUid2 = async (uid) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('applicationDashboards')
      .find({ uid: uid })
      .toArray();
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getApplicationDashboardsByTemplateDashboardUid = async (
  templateDashboardUid,
  grafanaInstanceLabel,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('applicationDashboards')
      .find({
        templateDashboardUid: templateDashboardUid,
        grafana: grafanaInstanceLabel,
      })
      .toArray();
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getApplicationDashboardsForSystemUnderTest = async (
  testRun,
  autoConfigGrafanaDashboard,
  applicationDashboardVariables,
) => {
  const q = {};
  q.testType = testRun.testType;
  q.system = testRun.systemUnderTest;

  if (testRun.testEnvironment) {
    q.testEnvironment = testRun.testEnvironment;
  }

  if (autoConfigGrafanaDashboard.requiresStaticData) {
    q.requiresStaticData = true;
  }

  if (applicationDashboardVariables) {
    Object.assign(q, applicationDashboardVariables);
  }

  try {
    const candidates = await mc
      .get()
      .db(db)
      .collection('applicationDashboards')
      .find(q)
      .toArray();

    if (candidates.length === 0) {
      return [];
    }

    let filteredCandidates = candidates;

    if (testRun.grafana) {
      filteredCandidates = candidates.filter(
        (ad) => ad.grafana === testRun.grafana,
      );
    }

    if (filteredCandidates.length === 0) {
      filteredCandidates = candidates.filter((ad) => ad.grafana === 'Default');
    }

    if (filteredCandidates.length === 0) {
      filteredCandidates = candidates;
    }

    if (testRun.version) {
      const versionFilteredCandidates = filteredCandidates.filter(
        (ad) => ad.version === testRun.version,
      );

      if (versionFilteredCandidates.length > 0) {
        return versionFilteredCandidates;
      }
    }

    const noVersionCandidates = filteredCandidates.filter(
      (ad) => ad.version == null,
    );

    if (noVersionCandidates.length > 0) {
      return noVersionCandidates;
    }

    if (testRun.rampupTimeInSeconds) {
      const rampupTimeFilteredCandidates = filteredCandidates.filter(
        (ad) => ad.rampupTimeInSeconds === testRun.rampupTimeInSeconds,
      );

      if (rampupTimeFilteredCandidates.length > 0) {
        return rampupTimeFilteredCandidates;
      }

      const noRampupTimeCandidates = filteredCandidates.filter(
        (ad) => ad.rampupTimeInSeconds == null,
      );

      if (noRampupTimeCandidates.length > 0) {
        return noRampupTimeCandidates;
      }
    }

    if (testRun.constantLoadTimeInSeconds) {
      const constantLoadTimeFilteredCandidates = filteredCandidates.filter(
        (ad) =>
          ad.constantLoadTimeInSeconds === testRun.constantLoadTimeInSeconds,
      );

      if (constantLoadTimeFilteredCandidates.length > 0) {
        return constantLoadTimeFilteredCandidates;
      }

      const noConstantLoadTimeCandidates = filteredCandidates.filter(
        (ad) => ad.constantLoadTimeInSeconds == null,
      );

      if (noConstantLoadTimeCandidates.length > 0) {
        return noConstantLoadTimeCandidates;
      }
    }

    if (testRun.annotations) {
      const annotationKeys = Object.keys(testRun.annotations);

      for (let key of annotationKeys) {
        const filteredCandidatesForAnnotation = filteredCandidates.filter(
          (ad) => ad[key] === testRun.annotations[key],
        );

        if (filteredCandidatesForAnnotation.length > 0) {
          filteredCandidates = filteredCandidatesForAnnotation;
        }
      }
    }

    return filteredCandidates;
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getApplicationDashboardsByDashboardUidRegex = async (
  testRun,
  autoConfigGrafanaDashboard,
  applicationDashboardVariables,
  dashboardUid,
) => {
  const q = {};
  q.testType = testRun.testType;
  q.system = testRun.systemUnderTest;

  if (testRun.testEnvironment) {
    q.testEnvironment = testRun.testEnvironment;
  }

  if (autoConfigGrafanaDashboard.requiresStaticData) {
    q.requiresStaticData = true;
  }

  if (applicationDashboardVariables) {
    Object.assign(q, applicationDashboardVariables);
  }

  q.uid = { $regex: dashboardUid, $options: 'i' };

  try {
    return await mc
      .get()
      .db(db)
      .collection('applicationDashboards')
      .find(q)
      .toArray();
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getExistingDeepLinks = (genericDeepLink, testRun) => {
  return mc
    .get()
    .db(db)
    .collection('deepLinks')
    .findOne({
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
    })
    .then((as) => as)
    .catch((e) => console.log(e));
};

module.exports.getBenchmarkForApplicationDashboard = async (
  applicationDashboard,
  testRun,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('benchmarks')
      .find({
        grafana: testRun.grafana,
        testRunId: testRun.testRunId,
        applicationDashboard: applicationDashboard._id,
      })
      .toArray();
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getReportPanelForApplicationDashboard = (
  applicationDashboard,
  genericReportPanelId,
  testType,
) => {
  return mc
    .get()
    .db(db)
    .collection('reportPanels')
    .findOne({
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
    })
    .then((as) => as)
    .catch((e) => console.log(e));
};

module.exports.getNumberOfReportPanels = async (
  applicationDashboard,
  testType,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('genericReportPanels')
      .countDocuments({
        applicationDashboard: applicationDashboard._id,
        testType,
      });
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getGrafanaDashboardByUid = async (grafanaLabel, uid) => {
  try {
    return await mc.get().db(db).collection('grafanaDashboards').findOne({
      grafana: grafanaLabel,
      uid: uid,
    });
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getGrafanaDashboardByUidForUpdate = async (
  grafanaLabel,
  uid,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('grafanaDashboards')
      .findOne({
        grafana: grafanaLabel,
        uid: uid,
        updateScheduled: { $ne: true },
      });
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.insertBenchmarkBasedOnGenericCheck = async (
  genericCheck,
  applicationDashboard,
  testRun,
) => {
  try {
    return await mc.get().db(db).collection('benchmarks').insertOne({
      _id: Random.id(),
      grafana: testRun.grafana,
      testRunId: testRun.testRunId,
      genericCheck: genericCheck._id,
      applicationDashboard: applicationDashboard._id,
      createdAt: new Date(),
    });
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.insertReportPanelBasedOnGenericReportPanel = (
  genericReportPanel,
  testRun,
  applicationDashboardFromTemplate,
  index,
) => {
  return mc
    .get()
    .db(db)
    .collection('reportPanels')
    .insertOne({
      _id: Random.secret(),
      application: testRun.application,
      testEnvironment: testRun.testEnvironment,
      testType: testRun.testType,
      grafana: applicationDashboardFromTemplate.grafana,
      dashboardLabel: applicationDashboardFromTemplate.dashboardLabel,
      dashboardId: applicationDashboardFromTemplate.dashboardId,
      dashboardUid: applicationDashboardFromTemplate.dashboardUid,
      panel: genericReportPanel.panel,
      index: index,
      genericReportPanelId: genericReportPanel.reportPanelId,
    })
    .then((as) => as)
    .catch((e) => console.log(e));
};

module.exports.insertDeepLinkBasedOnGenericDeepLink = (
  genericDeepLink,
  testRun,
) => {
  return mc
    .get()
    .db(db)
    .collection('deepLinks')
    .insertOne({
      _id: Random.secret(),
      application: testRun.application,
      testEnvironment: testRun.testEnvironment,
      testType: testRun.testType,
      name: genericDeepLink.name,
      url: genericDeepLink.url,
      genericDeepLinkId: genericDeepLink._id,
    })
    .then((as) => as)
    .catch((e) => console.log(e));
};

module.exports.getBenchmarksByUid = async (uid) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('benchmarks')
      .find({ uid: uid })
      .toArray();
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.updateBenchmark = async (benchmark) => {
  try {
    return await mc.get().db(db).collection('benchmarks').findOneAndUpdate(
      {
        _id: benchmark._id,
      },
      {
        $set: benchmark,
      },
      {
        upsert: true,
        returnOriginal: false,
      },
    );
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.upsertGrafanaDashboard = async (grafanaDashboard) => {
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
};

module.exports.removeGrafanaDashboard = async (id) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('grafanaDashboards')
      .deleteOne({ _id: id });
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.removeApplicationDashboards = async (grafana, dashboardUid) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('applicationDashboards')
      .deleteMany({
        grafana: grafana,
        uid: dashboardUid,
      });
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.updateApplicationDashboard = async (
  grafanaInstanceLabel,
  uid,
  applicationDashboard,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('applicationDashboards')
      .findOneAndUpdate(
        {
          grafana: grafanaInstanceLabel,
          uid: uid,
        },
        {
          $set: applicationDashboard,
        },
        {
          upsert: true,
          returnOriginal: false,
        },
      );
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.upsertApplicationDashboard = async (applicationDashboard) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('applicationDashboards')
      .findOneAndUpdate(
        {
          _id: applicationDashboard._id,
        },
        {
          $set: applicationDashboard,
        },
        {
          upsert: true,
          returnOriginal: false,
        },
      );
  } catch (e) {
    logger.logError(e, 'upsertApplicationDashboard failed');
    throw e;
  }
};

module.exports.updateApplicationDashboardVariables = async (
  applicationDashboard,
) => {
  try {
    const result = await mc
      .get()
      .db(db)
      .collection('applicationDashboards')
      .updateOne(
        {
          _id: applicationDashboard._id,
        },
        {
          $set: {
            variableValues: applicationDashboard.variableValues,
          },
        },
      );
    return result;
  } catch (e) {
    logger.logError(
      e,
      'updateApplicationDashboardVariables failed for application dashboard ' +
        applicationDashboard._id,
    );
    throw e;
  }
};

module.exports.deleteExpiredSnapshots = async (testRun) => {
  try {
    return await mc.get().db(db).collection('snapshots').deleteMany({
      testRunId: testRun.testRunId,
    });
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.updateVersion = async () => {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const version = packageData.version;

  try {
    return await mc
      .get()
      .db(db)
      .collection('version')
      .replaceOne({}, { version: version }, { upsert: true });
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getVersion = async () => {
  try {
    return await mc.get().db(db).collection('version').findOne({});
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.dropGrafanaPerfanaSyncEventsCollection = async () => {
  try {
    const result = await mc
      .get()
      .db(db)
      .collection('grafanaPerfanaSyncEvents')
      .drop();
    logger.info('Dropped grafanaPerfanaSyncEvents collection successfully');
    return result;
  } catch (e) {
    if (e.code === 26) {
      logger.info(
        'grafanaPerfanaSyncEvents collection does not exist, nothing to drop',
      );
      return { ok: 1 };
    } else {
      logger.logError(e, 'database operation');
      throw e;
    }
  }
};

module.exports.insertAutoConfigGrafanaDashboard = async (
  autoConfigGrafanaDashboard,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('autoConfigGrafanaDashboards')
      .insertOne(autoConfigGrafanaDashboard);
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.storeTemplatingValue = async (
  grafanaInstance,
  testRun,
  dashboard,
  templating,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('templatingValues')
      .findOneAndUpdate(
        {
          grafana: grafanaInstance.label,
          dashboardUid: dashboard.uid,
          templatingName: templating.name,
        },
        {
          $set: {
            grafana: grafanaInstance.label,
            dashboardUid: dashboard.uid,
            templatingName: templating.name,
            templatingValue: templating.current.value,
            testRunId: testRun.testRunId,
            testType: testRun.testType,
            systemUnderTest: testRun.systemUnderTest,
            testEnvironment: testRun.testEnvironment,
            createdDate: new Date(),
          },
        },
        {
          upsert: true,
          returnOriginal: false,
        },
      );
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getRecentTestRuns = async (lastSyncTimestamp) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('testRuns')
      .find({
        endTime: { $gte: lastSyncTimestamp },
      })
      .toArray();
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getExpiredTestRuns = async () => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('testRuns')
      .find({
        endTime: { $lte: new Date(Date.now() - 86400000) },
      })
      .toArray();
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getAutoconfigDashboards = async () => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('autoConfigGrafanaDashboards')
      .find({})
      .toArray();
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getAutoconfigDashboardsByUidAndProfile = async (
  uid,
  profile,
) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('autoConfigGrafanaDashboards')
      .find({
        uid: uid,
        profile: profile,
      })
      .toArray();
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getGenericChecks = async () => {
  try {
    return await mc.get().db(db).collection('genericChecks').find({}).toArray();
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getGenericDeepLinks = async () => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('genericDeepLinks')
      .find({})
      .toArray();
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getProfiles = async () => {
  try {
    return await mc.get().db(db).collection('profiles').find({}).toArray();
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

module.exports.getGenericReportPanels = async () => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('genericReportPanels')
      .find({})
      .toArray();
  } catch (e) {
    logger.logError(e, 'database operation');
    throw e;
  }
};

// TestRunSanityChecker functions - equivalent to TestRunEngine.kt methods

/**
 * Find all test runs older than specified date that are still in progress status
 * Equivalent to: TestRunEngine.kt:findAllOlderByStatusLastUpdateAndInProgressStatus
 */
module.exports.findTestRunsInProgressOlderThan = async (overdueDateTime) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('testRuns')
      .find({
        valid: true,
        end: { $lt: overdueDateTime },
        $or: [
          // evaluatingChecks statuses
          { 'status.evaluatingChecks': 'STARTED' },
          { 'status.evaluatingChecks': 'IN_PROGRESS' },
          { 'status.evaluatingChecks': 'RE_EVALUATE' },
          { 'status.evaluatingChecks': 'REFRESH' },
          { 'status.evaluatingChecks': 'BATCH_PROCESSING' },
          // evaluatingComparisons statuses
          { 'status.evaluatingComparisons': 'STARTED' },
          { 'status.evaluatingComparisons': 'IN_PROGRESS' },
          { 'status.evaluatingComparisons': 'RE_EVALUATE' },
          { 'status.evaluatingComparisons': 'REFRESH' },
          { 'status.evaluatingComparisons': 'BATCH_PROCESSING' },
          // evaluatingAdapt statuses
          { 'status.evaluatingAdapt': 'STARTED' },
          { 'status.evaluatingAdapt': 'IN_PROGRESS' },
          { 'status.evaluatingAdapt': 'RE_EVALUATE' },
          { 'status.evaluatingAdapt': 'RE_EVALUATE_ADAPT' },
          { 'status.evaluatingAdapt': 'REFRESH' },
          { 'status.evaluatingAdapt': 'BATCH_PROCESSING' },
        ],
      })
      .toArray();
  } catch (e) {
    logger.logError(e, 'findTestRunsInProgressOlderThan');
    throw e;
  }
};

/**
 * Update test run status to error for specified test run IDs
 * Equivalent to: TestRunEngine.kt:updateTestRunStatusToError
 */
module.exports.updateTestRunStatusToError = async (testRunIds) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('testRuns')
      .updateMany(
        { _id: { $in: testRunIds } },
        {
          $set: {
            status: 'ERROR',
            statusLastUpdate: new Date(),
          },
        },
      );
  } catch (e) {
    logger.logError(e, 'updateTestRunStatusToError');
    throw e;
  }
};

/**
 * Update reasons not valid for a test run (exception safe)
 * Equivalent to: TestRunEngine.kt:updateReasonsNotValidExceptionSafe
 */
module.exports.updateReasonsNotValid = async (testRunId, reasons) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('testRuns')
      .updateOne(
        { testRunId: testRunId },
        {
          $set: {
            reasonsNotValid: reasons,
            'status.lastUpdate': new Date(),
            valid: false,
          },
        },
      );
  } catch (e) {
    logger.logError(e, `updateReasonsNotValid for testRunId: ${testRunId}`);
    // Exception safe - don't throw, just log
    return null;
  }
};

// SanityChecker functions - equivalent to SanityChecker.kt methods

/**
 * Get all benchmarks for SLI/SLO sanity check
 * Equivalent to: mongoTemplate.findAll(Benchmark::class.java)
 */
module.exports.getAllBenchmarks = async () => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('benchmarks')
      .find({})
      .toArray();
  } catch (e) {
    logger.logError(e, 'getAllBenchmarks');
    throw e;
  }
};


/**
 * Get test runs for expiry based on end date and expired flag
 * Equivalent to: SanityChecker.kt:expireTestRuns query
 */
module.exports.getTestRunsForExpiry = async (expiryDate) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('testRuns')
      .find({
        end: { $lte: expiryDate },
        $or: [
          { expired: { $exists: false } },
          { expired: false }
        ]
      })
      .toArray();
  } catch (e) {
    logger.logError(e, 'getTestRunsForExpiry');
    throw e;
  }
};

/**
 * Expire a test run by setting expired flag to true
 * Equivalent to: SanityChecker.kt:expireTestRun()
 */
module.exports.expireTestRun = async (testRunId) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('testRuns')
      .updateOne(
        { _id: testRunId },
        { $set: { expired: true } }
      );
  } catch (e) {
    logger.logError(e, 'expireTestRun');
    throw e;
  }
};

/**
 * Remove snapshots by test run ID
 * Equivalent to: SanityChecker.kt:removeSnapshotReferences()
 */
module.exports.removeSnapshotsByTestRunId = async (testRunId) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('snapshots')
      .deleteMany({ testRunId: testRunId });
  } catch (e) {
    logger.logError(e, 'removeSnapshotsByTestRunId');
    throw e;
  }
};

/**
 * Get application by name
 * Equivalent to: mongoTemplate.findOne(Query.query(Criteria.where("name").isEqualTo(name)), Application::class.java)
 */
module.exports.getApplicationByName = async (name) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('applications')
      .findOne({ name: name });
  } catch (e) {
    logger.logError(e, 'getApplicationByName');
    throw e;
  }
};

/**
 * Get configuration by type and key
 * Equivalent to: mongoTemplate.findOne(configQuery, Configuration::class.java)
 */
module.exports.getConfigurationByTypeAndKey = async (type, key) => {
  try {
    return await mc
      .get()
      .db(db)
      .collection('configurations')
      .findOne({ 
        type: type,
        key: key 
      });
  } catch (e) {
    logger.logError(e, 'getConfigurationByTypeAndKey');
    throw e;
  }
};
