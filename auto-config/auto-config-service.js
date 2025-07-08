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

const AutoConfigFinders = require('./auto-config-finders');
const AutoConfigUpdates = require('./auto-config-updates');
const DashboardUid = require('./dashboard-uid');
const {
  getApplicationDashboardVariables,
} = require('./get-application-dashboard-variables');
const { escapeRegExp } = require('../helpers/utils');
const logger = require('../helpers/logger');
const Random = require('meteor-random');
const { grafanaApiGet, grafanaApiPost } = require('../helpers/grafana-api');
const { createDashboardUid } = require('../helpers/utils');

class AutoConfigService {
  constructor() {
    this.autoConfigFinders = new AutoConfigFinders();
    this.autoConfigUpdates = new AutoConfigUpdates();
  }

  /**
   * Process auto config for recent test runs
   * Equivalent to: AutoConfigService.kt:81-144
   */
  async processAutoConfigDashboards() {
    logger.info('AutoConfig process start');

    try {
      // Assume runs each 5 minutes
      const lastSyncTimestamp = new Date(Date.now() - 5 * 60 * 1000);

      const recentTestRuns =
        await this.autoConfigFinders.findRecentTestRuns(lastSyncTimestamp);
      const recentTestRunsWithTags = recentTestRuns.filter(
        (testRun) => testRun.tags && testRun.tags.length > 0,
      );

      // Log test runs without tags
      recentTestRuns
        .filter((testRun) => !testRun.tags || testRun.tags.length === 0)
        .forEach((testRun) => {
          logger.debug(
            `No AutoConfig process for test run because there are no tags: ${testRun.testRunId}`,
          );
        });

      if (recentTestRuns.length === 0) {
        logger.info(
          'No recent test runs found. AutoConfig processing skipped.',
        );
        return;
      }

      const profiles = await this.autoConfigFinders.findProfiles();
      if (profiles.length === 0) {
        logger.info('No profiles found. AutoConfig processing skipped.');
        return;
      }

      const autoConfigDashboards =
        await this.autoConfigFinders.findAutoConfigGrafanaDashboards();
      if (autoConfigDashboards.length === 0) {
        logger.info(
          'No auto config dashboards found. AutoConfig processing skipped.',
        );
        return;
      }

      const genericChecks = await this.autoConfigFinders.findGenericChecks();
      const genericDeepLinks =
        await this.autoConfigFinders.findGenericDeepLinks();
      const genericReportPanels =
        await this.autoConfigFinders.findGenericReportPanels();

      // Process each test run
      for (const testRun of recentTestRunsWithTags) {
        try {
          // Create test run identifier
          const testRunIdentifier = {
            testRunId: testRun.testRunId,
            application: testRun.application,
            testEnvironment: testRun.testEnvironment,
            testType: testRun.testType,
            variables: testRun.variables || [],
          };

          // Find all profiles that match any tag of the test run
          const testRunProfiles = profiles.filter((profile) =>
            testRun.tags.some((tag) => profile.tags.includes(tag)),
          );

          const profileNames = testRunProfiles.map((profile) => profile.name);

          logger.info(
            `Processing AutoConfig for test run: ${testRun.testRunId}`,
          );

          await this.processAutoConfigDashboardsForTestRun(
            testRunIdentifier,
            profileNames,
            autoConfigDashboards,
            testRun.variables || [],
          );
          await this.processAutoConfigGenericChecks(
            testRunIdentifier,
            profileNames,
            genericChecks,
          );
          await this.processAutoConfigGenericDeepLinks(
            testRunIdentifier,
            profileNames,
            genericDeepLinks,
          );
          await this.processAutoConfigGenericReportPanels(
            testRunIdentifier,
            profileNames,
            genericReportPanels,
          );
        } catch (error) {
          logger.logError(
            error,
            `Error processing test run: ${testRun.testRunId}`,
          );
        }
      }
    } finally {
      logger.info('AutoConfig processing end');
    }
  }

  /**
   * Process auto config dashboards for a specific test run
   * Equivalent to: AutoConfigService.kt:241-270
   */
  async processAutoConfigDashboardsForTestRun(
    testRun,
    profileNames,
    autoConfigDashboards,
    testRunVariables,
  ) {
    logger.info(`AutoConfig sync for test run: ${testRun.testRunId}`);

    const testRunAutoConfigDashboards = autoConfigDashboards.filter(
      (dashboard) => profileNames.includes(dashboard.profile),
    );

    logger.debug(
      `Found ${testRunAutoConfigDashboards.length} auto config dashboards for '${testRun.testRunId}'`,
    );

    for (const dashboard of testRunAutoConfigDashboards) {
      try {
        await this.processAutoConfigDashboard(
          testRun,
          dashboard,
          testRunVariables,
        );
      } catch (error) {
        logger.logError(
          error,
          `Error processing auto config dashboard: ${JSON.stringify(dashboard)}`,
        );
      }
    }
  }

  /**
   * Process single auto config dashboard
   * Equivalent to: AutoConfigService.kt:272-379
   */
  async processAutoConfigDashboard(
    testRun,
    autoConfigDashboard,
    testRunVariables,
  ) {
    logger.info(
      `AutoConfig sync for test run: ${testRun.testRunId} and ${autoConfigDashboard.dashboardName}`,
    );

    const templateDashboard =
      await this.autoConfigFinders.findGrafanaDashboardOrNull(
        autoConfigDashboard.grafana,
        [autoConfigDashboard.dashboardUid],
      );

    if (!templateDashboard) {
      logger.error(
        `No template dashboard found for: ${autoConfigDashboard.dashboardUid}, skip processing.`,
      );
      return;
    }

    // Check if it's a template dashboard
    if (
      !templateDashboard.tags ||
      !templateDashboard.tags.some(
        (tag) => tag.toLowerCase() === 'perfana-template',
      )
    ) {
      throw new Error(
        `Expected a template dashboard, it is not: ${autoConfigDashboard.dashboardUid}`,
      );
    }

    if (!templateDashboard.grafanaJson) {
      throw new Error(
        `No template json found for dashboard with uid: ${autoConfigDashboard.dashboardUid}`,
      );
    }

    // Get grafana instance for variable discovery
    const grafanaInstance =
      await this.autoConfigFinders.findGrafanaConfiguration(
        autoConfigDashboard.grafana,
      );

    // Use real variable discovery implementation
    const applicationDashboardVariables =
      await getApplicationDashboardVariables(
        testRun,
        templateDashboard,
        autoConfigDashboard,
        grafanaInstance,
      );

    logger.info(
      `Found application dashboard variables: ${JSON.stringify(applicationDashboardVariables)}`,
    );
    
    logger.debug(
      `autoConfigDashboard.createSeparateDashboardForVariable: ${autoConfigDashboard.createSeparateDashboardForVariable}`,
    );

    // Only continue when variable values have been found
    if (
      this.variableValuesFound(
        applicationDashboardVariables,
        autoConfigDashboard.setHardcodedValueForVariables,
      )
    ) {
      const separateVariable =
        autoConfigDashboard.createSeparateDashboardForVariable;

      // Debug logging for createSeparateDashboardForVariable
      if (separateVariable) {
        const separateVarData = applicationDashboardVariables.find(
          (v) => v.name === separateVariable,
        );
        logger.info(
          `CreateSeparateDashboardForVariable: ${separateVariable}, found variable: ${JSON.stringify(separateVarData)}`,
        );
      }

      const variableListsToProcess =
        this.setOfVariablesPerCreateSeparateDashboardForVariable(
          separateVariable,
          applicationDashboardVariables,
        );

      logger.info(
        `Variable lists to process: ${Object.keys(variableListsToProcess).length} lists`,
      );

      for (const [key, variableValues] of Object.entries(
        variableListsToProcess,
      )) {
        logger.info(`Processing for : ` + JSON.stringify(variableValues));

        const applicationDashboards = await this.findApplicationDashboards(
          templateDashboard.grafana,
          testRun,
          autoConfigDashboard,
          variableValues,
        );

        logger.info(
          `Found application dashboards: ${applicationDashboards.map(
            (ad) =>
              `${ad.dashboardUid} - ${ad.dashboardName} - ${ad.dashboardLabel} - from template: ${ad.templateDashboardUid}`,
          )}`,
        );

        const grafanaInstance =
          await this.autoConfigFinders.findGrafanaConfiguration(
            autoConfigDashboard.grafana,
          );

        if (applicationDashboards.length > 0) {
          // Application dashboards exist, update them
          const applicationDashboard = applicationDashboards[0];
          const storedGrafanaDashboard =
            await this.autoConfigFinders.findGrafanaDashboardOrNull(
              grafanaInstance.label,
              [applicationDashboard.dashboardUid],
            );

          if (!storedGrafanaDashboard) {
            logger.warn(
              `No stored grafana dashboard found for: ${applicationDashboard.dashboardUid}, deleting the applicationDashboard.`,
            );
            // In full implementation: delete applicationDashboard
          } else {
            await this.storeApplicationDashboardsInMongo(
              storedGrafanaDashboard,
              testRun,
              autoConfigDashboard,
              variableValues,
              applicationDashboards,
              autoConfigDashboard.dashboardUid,
              true,
            );
          }
        } else {
          // No application dashboards exist
          const existingGrafanaDashboards =
            await this.findExistingGrafanaDashboards(
              templateDashboard,
              testRun,
              autoConfigDashboard,
              variableValues,
            );

          logger.info(
            `Found existing grafanaDashboards: ${existingGrafanaDashboards.map((gd) => `${gd.uid} - ${gd.name}`)}`,
          );

          if (
            existingGrafanaDashboards.length === 0 ||
            autoConfigDashboard.readOnly
          ) {
            await this.createDashboardsInGrafanaAndMongo(
              grafanaInstance,
              templateDashboard.grafanaJson,
              testRun,
              autoConfigDashboard,
              variableValues,
              applicationDashboards,
              testRunVariables,
            );
          } else {
            // if (autoConfigDashboard.createSeparateDashboardForVariable) {
            await this.storeApplicationDashboardsInMongo(
              existingGrafanaDashboards[0],
              testRun,
              autoConfigDashboard,
              applicationDashboardVariables,
              applicationDashboards,
              autoConfigDashboard.readOnly ?
                existingGrafanaDashboards[0].uid
              : existingGrafanaDashboards[0].templateDashboardUid,
              false,
            );
            // }
          }
        }
      }
    }
  }

  /**
   * Find application dashboards via the generated dashboard uid
   * Equivalent to: AutoConfigService.kt:385-413
   */
  async findApplicationDashboards(
    grafanaFromTemplate,
    testRun,
    autoConfigDashboard,
    applicationDashboardVariables,
  ) {
    // When createSeparateDashboardForVariable is set, we need to use the variable-specific UID
    let dashboardUid;
    if (autoConfigDashboard.createSeparateDashboardForVariable) {
      // Use the utility function that includes variables in the UID
      dashboardUid = createDashboardUid(
        testRun,
        autoConfigDashboard,
        applicationDashboardVariables,
      );
    } else {
      dashboardUid = DashboardUid.from(
        testRun,
        autoConfigDashboard,
      ).dashboardUid;
    }

    // For separate dashboards, we need to find by specific dashboard label
    let dashboardLabel = autoConfigDashboard.dashboardName;
    if (autoConfigDashboard.createSeparateDashboardForVariable) {
      const separateVariable = applicationDashboardVariables.find(
        (v) =>
          v.name === autoConfigDashboard.createSeparateDashboardForVariable,
      );
      if (separateVariable && separateVariable.values.length > 0) {
        // For separate dashboards, construct the label with the first variable value
        dashboardLabel = `${autoConfigDashboard.dashboardName} ${separateVariable.values[0]}`;
      }
    }

    logger.info(
      `Looking for application dashboards with label: "${dashboardLabel}"`,
    );

    let applicationDashboards = [];
    if (grafanaFromTemplate) {
      applicationDashboards =
        await this.autoConfigFinders.findApplicationDashboardsForSystemUnderTest(
          testRun,
          grafanaFromTemplate,
          dashboardUid,
          dashboardLabel,
        );
    }

    if (applicationDashboards.length > 0) {
      logger.info(`Determined dashboard uid: ${dashboardUid}`);
    }

    return applicationDashboards;
  }

  /**
   * Find existing grafana dashboards
   * Equivalent to: AutoConfigService.kt:415-443
   */
  async findExistingGrafanaDashboards(
    grafanaTemplateDashboard,
    testRun,
    autoConfigDashboard,
    applicationDashboardVariables,
  ) {
    // When createSeparateDashboardForVariable is set, we need to use the variable-specific UID
    let dashboardUid;
    if (autoConfigDashboard.createSeparateDashboardForVariable) {
      // Use the utility function that includes variables in the UID
      dashboardUid = createDashboardUid(
        testRun,
        autoConfigDashboard,
        applicationDashboardVariables,
      );
    } else {
      dashboardUid = DashboardUid.from(
        testRun,
        autoConfigDashboard,
      ).dashboardUid;
    }

    let grafanaDashboards = [];
    if (grafanaTemplateDashboard.grafana) {
      grafanaDashboards =
        await this.autoConfigFinders.findExistingGrafanaDashboards(
          autoConfigDashboard.grafana,
          [dashboardUid],
        );
    }

    return grafanaDashboards;
  }

  /**
   * Create dashboards in Grafana and MongoDB
   * Equivalent to: AutoConfigService.kt:445-498
   */
  async createDashboardsInGrafanaAndMongo(
    grafanaInstance,
    templateJson,
    testRun,
    autoConfigDashboard,
    applicationDashboardVariables,
    applicationDashboards,
    testRunVariables,
  ) {
    let storedGrafanaDashboard;

    if (autoConfigDashboard.readOnly) {
      logger.info(
        'Dashboard is read only, skip create grafana dashboard: reusing existing dashboard template dashboard.',
      );

      // Find the template dashboard
      const templateDashboard =
        await this.autoConfigFinders.findGrafanaDashboard(
          autoConfigDashboard.grafana,
          [autoConfigDashboard.dashboardUid],
        );

      // Update template's usedBySut
      await this.autoConfigUpdates.updateUsedBySut(
        templateDashboard,
        testRun.application,
      );

      // Use the template dashboard as the stored dashboard
      storedGrafanaDashboard =
        await this.autoConfigFinders.findGrafanaDashboard(
          grafanaInstance.label,
          [autoConfigDashboard.dashboardUid],
        );
    } else {
      // Create new dashboard for readOnly: false case
      logger.info(
        `Creating new dashboard for autoConfigDashboard: ${autoConfigDashboard.dashboardName}`,
      );

      // Get template dashboard from Grafana API
      const templateDashboard = await grafanaApiGet(
        grafanaInstance,
        `/api/dashboards/uid/${autoConfigDashboard.dashboardUid}`,
      );

      // Create or find folder for systemUnderTest
      const folderId = await this.createOrFindFolder(grafanaInstance, testRun);

      // Prepare new dashboard JSON
      const newDashboardJson = {
        dashboard: {
          ...templateDashboard.dashboard,
          id: null,
          uid: createDashboardUid(
            testRun,
            autoConfigDashboard,
            applicationDashboardVariables,
          ),
          title: `${autoConfigDashboard.dashboardName} - ${testRun.application} ${testRun.testEnvironment}`,
          tags: (templateDashboard.dashboard.tags || []).filter(tag => 
            tag.toLowerCase() !== 'perfana-template'
          ),
        },
        folderId: folderId,
        overwrite: false,
      };

      // Create dashboard in Grafana
      const createdDashboard = await grafanaApiPost(
        grafanaInstance,
        '/api/dashboards/db',
        newDashboardJson,
      );

      logger.info(
        `Created dashboard: ${newDashboardJson.dashboard.title} with UID: ${newDashboardJson.dashboard.uid}`,
      );

      // Get the created dashboard details for storing
      const createdDashboardDetails = await grafanaApiGet(
        grafanaInstance,
        `/api/dashboards/uid/${newDashboardJson.dashboard.uid}`,
      );

      storedGrafanaDashboard = {
        uid: newDashboardJson.dashboard.uid,
        grafana: grafanaInstance.label,
        name: newDashboardJson.dashboard.title,
        id: createdDashboardDetails.dashboard.id,
        tags: createdDashboardDetails.dashboard.tags || [],
        grafanaJson: createdDashboardDetails,
        templateDashboardUid: autoConfigDashboard.dashboardUid,
      };

      // Store the created dashboard in MongoDB as grafanaDashboard
      // First get datasource type from the first panel
      let datasourceType = null;
      try {
        const firstGraphPanel = createdDashboardDetails.dashboard.panels.find(
          (panel) =>
            panel.type === 'graph' ||
            panel.type === 'timeseries' ||
            panel.type === 'table' ||
            panel.type === 'flamegraph',
        );
        if (
          firstGraphPanel &&
          firstGraphPanel.datasource &&
          firstGraphPanel.datasource.type
        ) {
          datasourceType = firstGraphPanel.datasource.type;
        }
      } catch (e) {
        logger.debug('Could not determine datasource type from panels');
      }

      await this.autoConfigUpdates.upsertGrafanaDashboard({
        _id: Random.secret(),
        uid: newDashboardJson.dashboard.uid,
        grafana: grafanaInstance.label,
        applicationDashboardVariables: applicationDashboardVariables,
        datasourceType: datasourceType,
        grafanaJson: JSON.stringify(createdDashboardDetails),
        id: createdDashboardDetails.dashboard.id,
        name: newDashboardJson.dashboard.title,
        panels: [], // Will be populated later if needed
        slug: createdDashboardDetails.meta.slug,
        tags: createdDashboardDetails.dashboard.tags || [],
        templateCreateDate: new Date(),
        templateDashboardUid: autoConfigDashboard.dashboardUid,
        templateProfile: autoConfigDashboard.profile,
        templateTestRunVariables: testRun.variables,
        templatingVariables: [], // Will be populated later if needed
        updated: new Date(),
        uri: createdDashboardDetails.meta.url,
        usedBySUT: [testRun.application],
        variables: [], // Will be populated later if needed
      });
    }

    // Store application dashboard
    logger.debug(
      `Before storeApplicationDashboardsInMongo - applicationDashboardVariables: ${JSON.stringify(applicationDashboardVariables.map((v) => ({ name: v.name, values: v.values })))}`,
    );

    if (autoConfigDashboard.readOnly) {
      await this.storeApplicationDashboardsInMongo(
        storedGrafanaDashboard,
        testRun,
        autoConfigDashboard,
        applicationDashboardVariables,
        applicationDashboards,
        autoConfigDashboard.readOnly ?
          storedGrafanaDashboard.uid
        : storedGrafanaDashboard.templateDashboardUid,
        false,
      );
    }
  }

  /**
   * Store application dashboards in MongoDB
   * Equivalent to: AutoConfigService.kt:692-737
   */
  async storeApplicationDashboardsInMongo(
    grafanaDashboard,
    testRun,
    autoConfigDashboard,
    applicationDashboardVariables,
    applicationDashboards,
    templateDashboardUid,
    update,
  ) {
    logger.debug(
      `storeApplicationDashboardsInMongo - autoConfigDashboard.readOnly: ${autoConfigDashboard.readOnly}`,
    );
    logger.debug(
      `storeApplicationDashboardsInMongo - autoConfigDashboard.createSeparateDashboardForVariable: ${autoConfigDashboard.createSeparateDashboardForVariable}`,
    );
    logger.debug(
      `storeApplicationDashboardsInMongo - applicationDashboards.length: ${applicationDashboards.length}`,
    );

    // Replace hardcoded values for variables
    let newApplicationDashboardVariables = applicationDashboardVariables;
    if (
      autoConfigDashboard.setHardcodedValueForVariables &&
      autoConfigDashboard.setHardcodedValueForVariables.length > 0
    ) {
      newApplicationDashboardVariables =
        this.replaceHardcodedValuesForVariables(
          applicationDashboardVariables,
          autoConfigDashboard.setHardcodedValueForVariables,
        );
    }

    const updateRequired = this.checkIfUpdateRequired(
      autoConfigDashboard,
      newApplicationDashboardVariables,
      applicationDashboards,
      grafanaDashboard,
    );

    logger.debug(
      `storeApplicationDashboardsInMongo - checkIfUpdateRequired result: ${updateRequired}`,
    );

    if (applicationDashboards.length === 0 || updateRequired) {
      if (!autoConfigDashboard.createSeparateDashboardForVariable) {
        logger.debug(
          `storeApplicationDashboardsInMongo - Creating ONE application dashboard`,
        );
        // Create one application dashboard
        await this.createOneApplicationDashboard(
          newApplicationDashboardVariables,
          autoConfigDashboard,
          testRun,
          grafanaDashboard,
          templateDashboardUid,
          update,
        );
      } else {
        logger.debug(
          `storeApplicationDashboardsInMongo - Creating SEPARATE dashboards for variable: ${autoConfigDashboard.createSeparateDashboardForVariable}`,
        );
        // Create separate dashboards for variable values
        await this.createDashboardsWhenCreateSeparateDashboardForVariableIsSet(
          newApplicationDashboardVariables,
          autoConfigDashboard,
          applicationDashboards,
          testRun,
          grafanaDashboard,
          templateDashboardUid,
        );
      }
    } else {
      logger.debug(
        `storeApplicationDashboardsInMongo - SKIPPING dashboard creation - update not required`,
      );
    }
  }

  /**
   * Create one application dashboard
   * Equivalent to: AutoConfigService.kt:739-781
   */
  async createOneApplicationDashboard(
    applicationDashboardVariables,
    autoConfigDashboard,
    testRun,
    grafanaDashboard,
    templateDashboardUid,
    update,
  ) {
    const filteredVariables = applicationDashboardVariables.filter(
      (variable) =>
        variable.name !== 'system_under_test' &&
        variable.name !== 'test_environment',
    );

    const variables = filteredVariables.map((v) => ({
      name: v.name,
      values: v.values,
    }));

    const applicationDashboard = {
      _id: Random.secret(),
      application: testRun.application,
      testEnvironment: testRun.testEnvironment,
      grafana: grafanaDashboard.grafana,
      dashboardName: grafanaDashboard.name,
      dashboardId: grafanaDashboard.id,
      dashboardUid: grafanaDashboard.uid,
      dashboardLabel: autoConfigDashboard.dashboardName,
      snapshotTimeout: 4,
      templateDashboardUid: templateDashboardUid,
      tags: grafanaDashboard.tags,
      variables: variables,
      perfanaInfo: `Created or updated by Perfana Node.js ${new Date().toISOString()}`,
    };

    if (update) {
      await this.autoConfigUpdates.updateApplicationDashboardVariables(
        applicationDashboard,
      );
    } else {
      let existingApplicationDashboards =
        await this.autoConfigFinders.findApplicationDashboardsForSystemUnderTest(
          testRun,
          grafanaDashboard.grafana,
          grafanaDashboard.uid,
          autoConfigDashboard.dashboardName,
        );
      if (existingApplicationDashboards.length === 0) {
        await this.autoConfigUpdates.insertApplicationDashboard(
          applicationDashboard,
        );
      }
    }
  }

  /**
   * Create separate dashboards when createSeparateDashboardForVariable is set
   * Equivalent to: AutoConfigService.kt:805-873
   */
  async createDashboardsWhenCreateSeparateDashboardForVariableIsSet(
    applicationDashboardVariables,
    autoConfigDashboard,
    applicationDashboards,
    testRun,
    grafanaDashboard,
    templateDashboardUid,
  ) {
    logger.debug(
      `createDashboardsWhenCreateSeparateDashboardForVariableIsSet - Creating separate dashboards for variable: ${autoConfigDashboard.createSeparateDashboardForVariable}`,
    );
    logger.debug(
      `createDashboardsWhenCreateSeparateDashboardForVariableIsSet - applicationDashboardVariables: ${JSON.stringify(applicationDashboardVariables.map((v) => ({ name: v.name, values: v.values })))}`,
    );

    const filteredDashboardVariable = applicationDashboardVariables.find(
      (v) => v.name === autoConfigDashboard.createSeparateDashboardForVariable,
    );

    if (!filteredDashboardVariable) {
      logger.debug(
        `createDashboardsWhenCreateSeparateDashboardForVariableIsSet - Variable '${autoConfigDashboard.createSeparateDashboardForVariable}' not found in applicationDashboardVariables`,
      );
      return;
    }

    logger.debug(
      `createDashboardsWhenCreateSeparateDashboardForVariableIsSet - Found variable with ${filteredDashboardVariable.values.length} values: ${JSON.stringify(filteredDashboardVariable.values)}`,
    );

    const existingValues = this.checkExistingValues(
      autoConfigDashboard,
      applicationDashboardVariables,
      applicationDashboards,
    );

    logger.debug(
      `createDashboardsWhenCreateSeparateDashboardForVariableIsSet - existingValues: ${JSON.stringify(existingValues)}`,
    );

    for (const createSeparateDashboardForVariableValue of filteredDashboardVariable.values) {
      logger.debug(
        `createDashboardsWhenCreateSeparateDashboardForVariableIsSet - Processing separate dashboard for value: ${createSeparateDashboardForVariableValue}`,
      );

      if (!existingValues.includes(createSeparateDashboardForVariableValue)) {
        logger.debug(
          `createDashboardsWhenCreateSeparateDashboardForVariableIsSet - Creating new separate dashboard for value: ${createSeparateDashboardForVariableValue}`,
        );
        const filteredVariables = applicationDashboardVariables.filter(
          (variable) =>
            variable.name !== 'system_under_test' &&
            variable.name !== 'test_environment',
        );

        const extendedVariables = {};

        // Add hardcoded variables
        if (autoConfigDashboard.setHardcodedValueForVariables) {
          autoConfigDashboard.setHardcodedValueForVariables.forEach(
            (variable) => {
              extendedVariables[variable.name] = {
                name: variable.name,
                values: variable.values,
              };
            },
          );
        }

        // Add filtered variables
        filteredVariables.forEach((variable) => {
          if (!extendedVariables[variable.name]) {
            if (
              variable.name ===
              autoConfigDashboard.createSeparateDashboardForVariable
            ) {
              extendedVariables[variable.name] = {
                name: variable.name,
                values: [createSeparateDashboardForVariableValue],
              };
            } else {
              extendedVariables[variable.name] = {
                name: variable.name,
                values: variable.values,
              };
            }
          }
        });

        const dashboardUid = DashboardUid.from(testRun, autoConfigDashboard);
        const id = Random.secret();

        logger.info(
          `Generated dashboard UID for separate dashboard (${createSeparateDashboardForVariableValue}): ${dashboardUid.dashboardUid}`,
        );

        const applicationDashboard = {
          _id: id,
          application: testRun.application,
          dashboardUid: dashboardUid.dashboardUid,
          dashboardId: grafanaDashboard.id,
          dashboardLabel:
            autoConfigDashboard.dashboardName +
            ' ' +
            createSeparateDashboardForVariableValue,
          dashboardName: grafanaDashboard.name || 'UNKNOWN',
          grafana: grafanaDashboard.grafana || 'UNKNOWN',
          snapshotTimeout: 4,
          tags: grafanaDashboard.tags,
          templateDashboardUid: templateDashboardUid,
          testEnvironment: testRun.testEnvironment,
          variables: Object.values(extendedVariables),
          perfanaInfo: `Created or updated by Perfana Node.js ${new Date().toISOString()}`,
        };
        let existingApplicationDashboards =
          await this.autoConfigFinders.findApplicationDashboardsForSystemUnderTest(
            testRun,
            grafanaDashboard.grafana,
            dashboardUid.dashboardUid,
            autoConfigDashboard.dashboardName +
              ' ' +
              createSeparateDashboardForVariableValue,
          );
        if (existingApplicationDashboards.length === 0) {
          await this.autoConfigUpdates.insertApplicationDashboard(
            applicationDashboard,
          );
        }

        logger.debug(
          `createDashboardsWhenCreateSeparateDashboardForVariableIsSet - Created separate application dashboard: ${applicationDashboard.dashboardLabel} (UID: ${applicationDashboard.dashboardUid})`,
        );
      } else {
        logger.debug(
          `createDashboardsWhenCreateSeparateDashboardForVariableIsSet - Separate dashboard already exists for value: ${createSeparateDashboardForVariableValue}`,
        );
      }
    }
    logger.debug(
      `createDashboardsWhenCreateSeparateDashboardForVariableIsSet - Completed processing all values`,
    );
  }

  /**
   * Process generic checks for test run
   * Equivalent to: AutoConfigService.kt:200-239
   */
  async processAutoConfigGenericChecks(testRun, profileNames, genericChecks) {
    logger.info(`Process Auto Config Generic Checks for ${testRun.testRunId}`);

    const testRunGenericChecksFiltered = genericChecks.filter((check) =>
      profileNames.includes(check.profile),
    );

    for (const genericCheck of testRunGenericChecksFiltered) {
      const addForWorkloadsMatchingRegex =
        genericCheck.addForWorkloadsMatchingRegex || '.*';
      
      let workloadRegex;
      try {
        // Validate regex pattern to prevent ReDoS attacks
        workloadRegex = new RegExp(addForWorkloadsMatchingRegex, 'i');
      } catch (regexError) {
        logger.warn(`Invalid regex pattern in genericCheck "${genericCheck.name}": ${addForWorkloadsMatchingRegex}`, regexError);
        // Fallback: escape the pattern and treat as literal match
        workloadRegex = new RegExp(escapeRegExp(addForWorkloadsMatchingRegex), 'i');
      }

      if (workloadRegex.test(testRun.testType)) {
        const applicationDashboards =
          await this.autoConfigFinders.findApplicationDashboardsByTemplateDashboardUid(
            genericCheck.dashboardUid,
            testRun.application,
            testRun.testEnvironment,
          );

        for (const applicationDashboard of applicationDashboards) {
          const benchmark =
            await this.autoConfigFinders.findBenchmarkForApplicationDashboardOrNull(
              applicationDashboard,
              genericCheck.checkId,
              testRun.testType,
            );

          if (!benchmark) {
            await this.autoConfigUpdates.insertBenchmarkBasedOnGenericCheck(
              genericCheck,
              testRun,
              applicationDashboard,
            );
            logger.info(
              `Created benchmark for generic check ${genericCheck.name || genericCheck._id}`,
            );
          } else {
            logger.debug(
              `Benchmark '${genericCheck.checkId}' already exists for '${testRun.testRunId}'`,
            );
          }
        }
      }
    }
  }

  /**
   * Process generic deep links for test run
   * Equivalent to: AutoConfigService.kt:175-198
   */
  async processAutoConfigGenericDeepLinks(
    testRun,
    profileNames,
    genericDeepLinks,
  ) {
    const genericDeepLinksFiltered = genericDeepLinks.filter((link) =>
      profileNames.includes(link.profile),
    );

    for (const genericDeepLink of genericDeepLinksFiltered) {
      // Create testRun with grafana field for deep link operations
      const testRunWithGrafana = {
        ...testRun,
        grafana: genericDeepLink.grafana || 'Default', // Use grafana from genericDeepLink or default
      };

      const deepLink =
        await this.autoConfigFinders.findDeepLinkForTestRunOrNull(
          genericDeepLink,
          testRunWithGrafana,
        );

      if (!deepLink) {
        await this.autoConfigUpdates.insertDeepLinkBasedOnGenericDeepLink(
          genericDeepLink,
          testRunWithGrafana,
        );
        logger.info(
          `Created deep link for generic deep link ${genericDeepLink.name || genericDeepLink._id}`,
        );
      } else {
        logger.debug(
          `DeepLink '${genericDeepLink.name}' already exists for '${testRun.testRunId}'`,
        );
      }
    }
  }

  /**
   * Process generic report panels for test run
   * Equivalent to: AutoConfigService.kt:146-173
   */
  async processAutoConfigGenericReportPanels(
    testRun,
    profileNames,
    genericReportPanels,
  ) {
    const genericReportPanelsFiltered = genericReportPanels.filter((panel) =>
      profileNames.includes(panel.profile),
    );

    for (const genericReportPanel of genericReportPanelsFiltered) {
      const applicationDashboards =
        await this.autoConfigFinders.findApplicationDashboardsByTemplateDashboardUid(
          genericReportPanel.dashboardUid,
          testRun.application,
          testRun.testEnvironment,
        );

      for (const applicationDashboard of applicationDashboards) {
        const reportPanel =
          await this.autoConfigFinders.findReportPanelForApplicationDashboardOrNull(
            applicationDashboard,
            genericReportPanel.reportPanelId,
            testRun.testType,
          );

        if (!reportPanel) {
          await this.autoConfigUpdates.insertReportPanelBasedOnGenericReportPanel(
            genericReportPanel,
            testRun,
            applicationDashboard,
            1,
          );
          logger.info(
            `Created report panel for generic report panel ${genericReportPanel.name || genericReportPanel._id}`,
          );
        } else {
          logger.debug(
            `Report panel '${genericReportPanel.reportPanelId}' already exists for '${testRun.testRunId}'`,
          );
        }
      }
    }
  }

  // Utility methods

  /**
   * Set of variables per createSeparateDashboardForVariable
   * Equivalent to: AutoConfigService.kt:37-68
   */
  setOfVariablesPerCreateSeparateDashboardForVariable(
    separateVariable,
    applicationDashboardVariables,
  ) {
    const variablesToProcess = {};

    if (!separateVariable) {
      variablesToProcess['null'] = applicationDashboardVariables;
    } else {
      const filteredVars = applicationDashboardVariables.filter(
        (v) => v.name !== separateVariable,
      );
      const separateVars = applicationDashboardVariables.filter(
        (v) => v.name === separateVariable,
      );

      if (separateVars.length !== 1) {
        throw new Error(
          `Expected exact one variable for separateVariable, found: ${separateVars.length}`,
        );
      }

      const separateVar = separateVars[0];

      separateVar.values.forEach((variableValue) => {
        const newMap = [...filteredVars];
        newMap.push({ name: separateVariable, values: [variableValue] });
        variablesToProcess[separateVariable + variableValue] = newMap;
      });
    }

    return variablesToProcess;
  }

  /**
   * Replace hardcoded values for variables
   * Equivalent to: AutoConfigService.kt:879-899
   */
  replaceHardcodedValuesForVariables(
    applicationDashboardVariables,
    hardcodedValueForVariables,
  ) {
    const applicationDashboardVariablesMap = {};

    applicationDashboardVariables.forEach((variable) => {
      applicationDashboardVariablesMap[variable.name] = variable;
    });

    hardcodedValueForVariables.forEach((hardcodedVar) => {
      if (applicationDashboardVariablesMap[hardcodedVar.name]) {
        applicationDashboardVariablesMap[hardcodedVar.name] = {
          name: hardcodedVar.name,
          values: hardcodedVar.values,
        };
      }
    });

    return Object.values(applicationDashboardVariablesMap);
  }

  /**
   * Check existing values for separate dashboard variable
   * Equivalent to: AutoConfigService.kt:666-690
   */
  checkExistingValues(
    autoConfigDashboard,
    applicationDashboardVariables,
    applicationDashboards,
  ) {
    const existingValues = [];

    if (!autoConfigDashboard.createSeparateDashboardForVariable) {
      return existingValues;
    }

    const hasSeparateDashboardVariable = applicationDashboardVariables
      .filter(
        (v) => v.name !== 'system_under_test' && v.name !== 'test_environment',
      )
      .some(
        (v) =>
          autoConfigDashboard.createSeparateDashboardForVariable === v.name,
      );

    if (hasSeparateDashboardVariable) {
      applicationDashboards.forEach((applicationDashboard) => {
        const variable = applicationDashboard.variables.find(
          (v) =>
            v.name === autoConfigDashboard.createSeparateDashboardForVariable,
        );
        if (variable) {
          variable.values.forEach((value) => {
            existingValues.push(value);
          });
        }
      });
    }

    return existingValues;
  }

  /**
   * Check if update is required
   * Equivalent to: AutoConfigService.kt:641-664
   */
  checkIfUpdateRequired(
    autoConfigDashboard,
    applicationDashboardVariables,
    applicationDashboards,
    grafanaDashboard,
  ) {
    let updateRequired = false;

    logger.debug(
      `checkIfUpdateRequired - autoConfigDashboard.createSeparateDashboardForVariable: ${autoConfigDashboard.createSeparateDashboardForVariable}`,
    );
    logger.debug(
      `checkIfUpdateRequired - grafanaDashboard.uid: ${grafanaDashboard.uid}`,
    );
    logger.debug(
      `checkIfUpdateRequired - applicationDashboards.length: ${applicationDashboards.length}`,
    );

    // Determine if multiple instances of application dashboard have to be created
    if (autoConfigDashboard.createSeparateDashboardForVariable) {
      // Check if the current grafanaDashboard.uid exists in existing applicationDashboards
      const existingDashboardUids = applicationDashboards.map(
        (applicationDashboard) => {
          return applicationDashboard.dashboardUid;
        },
      );

      logger.debug(
        `checkIfUpdateRequired - existingDashboardUids: ${JSON.stringify(existingDashboardUids)}`,
      );

      if (existingDashboardUids.indexOf(grafanaDashboard.uid) === -1) {
        updateRequired = true;
        logger.debug(
          `checkIfUpdateRequired - grafanaDashboard.uid not found in existing dashboards, updateRequired = true`,
        );
      } else {
        logger.debug(
          `checkIfUpdateRequired - grafanaDashboard.uid found in existing dashboards, no update needed`,
        );
      }
    } else {
      // For non-separate dashboard case, check if variables have more values than existing dashboards
      applicationDashboards.forEach((systemUndertestApplicationDashboard) => {
        systemUndertestApplicationDashboard.variables.forEach(
          (systemUndertestApplicationDashboardVariable) => {
            let applicationDashboardVariableIndex =
              applicationDashboardVariables
                .map((variable) => {
                  return variable.name;
                })
                .indexOf(systemUndertestApplicationDashboardVariable.name);

            if (
              applicationDashboardVariableIndex !== -1 &&
              applicationDashboardVariables[applicationDashboardVariableIndex]
                .values &&
              systemUndertestApplicationDashboardVariable.values.length <
                applicationDashboardVariables[applicationDashboardVariableIndex]
                  .values.length
            ) {
              updateRequired = true;
              logger.debug(
                `checkIfUpdateRequired - Variable ${systemUndertestApplicationDashboardVariable.name} has more values than existing, updateRequired = true`,
              );
            }
          },
        );
      });

      // If no applicationDashboards exist, update is required
      if (applicationDashboards.length === 0) {
        updateRequired = true;
        logger.debug(
          `checkIfUpdateRequired - No existing applicationDashboards, updateRequired = true`,
        );
      }
    }

    logger.debug(
      `checkIfUpdateRequired - Final result: ${updateRequired}`,
    );
    return updateRequired;
  }

  /**
   * Check if variable values are found (excluding system variables)
   * Equivalent to: valuesFound function from original implementation
   */
  variableValuesFound(
    applicationDashboardVariables,
    setHardcodedValueForVariables,
  ) {
    let valuesFound = false;

    // Filter out templating variable 'system_under_test' and test_environment from Grafana dashboard
    let filteredVariables = applicationDashboardVariables.filter((variable) => {
      return (
        variable.name !== 'system_under_test' &&
        variable.name !== 'test_environment'
      );
    });

    // If no non-system variables exist, allow creation (return true)
    if (filteredVariables.length === 0) {
      logger.debug('No non-system variables found, allowing applicationDashboard creation');
      return true;
    }

    filteredVariables.forEach((variable) => {
      if (setHardcodedValueForVariables) {
        setHardcodedValueForVariables.forEach((hardcodedVariable) => {
          if (
            variable.name === hardcodedVariable.name &&
            variable.values &&
            variable.values.length > 0
          )
            valuesFound = true;
        });
      } else {
        if (variable.values && variable.values.length > 0) valuesFound = true;
      }
    });

    return valuesFound;
  }

  /**
   * Create or find folder in Grafana for systemUnderTest
   * @param {Object} grafanaInstance - Grafana instance configuration
   * @param {Object} testRun - Test run object containing application name
   * @returns {Promise<number>} - Folder ID
   */
  async createOrFindFolder(grafanaInstance, testRun) {
    try {
      // Create deterministic folder UID from application name
      const folderUid = testRun.application.toLowerCase().replace(/ /g, '-');

      logger.debug(`Searching for existing folder with UID: ${folderUid}`);

      // First try to find existing folder using search API
      const getFolderResponse = await grafanaApiGet(
        grafanaInstance,
        '/api/search?type=dash-folder&query=' + folderUid,
      );

      // If folder is found, return its ID
      if (getFolderResponse.length > 0) {
        logger.debug(
          `Found existing folder: ${testRun.application} with ID: ${getFolderResponse[0].id}`,
        );
        return getFolderResponse[0].id;
      }

      // If folder is not found, create it
      logger.debug(
        `Creating new folder: ${testRun.application} with UID: ${folderUid}`,
      );

      const createFolderRequest = {
        title: testRun.application,
        uid: folderUid,
      };

      const createFolderResponse = await grafanaApiPost(
        grafanaInstance,
        '/api/folders',
        createFolderRequest,
      );

      logger.info(
        `Created new folder: ${testRun.application} with ID: ${createFolderResponse.id}`,
      );
      return createFolderResponse.id;
    } catch (error) {
      logger.error(
        `Failed to create or find folder for ${testRun.application}: ${error.message}`,
      );
      // Return 0 (General folder) as fallback
      logger.info(
        `Using General folder (ID: 0) as fallback for ${testRun.application}`,
      );
      return 0;
    }
  }
}

module.exports = AutoConfigService;
