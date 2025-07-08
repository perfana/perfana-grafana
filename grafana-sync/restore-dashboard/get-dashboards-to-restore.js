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

const {
  getGrafanaDashboardsForGrafanaInstance,
  getApplicationDashboardsByUid,
} = require('../../helpers/perfana-mongo');
const logger = require('../../helpers/logger');

const grafanaDbConnection = require('../../helpers/grafanaDb');

module.exports.getDashboardsToRestore = async (grafana) => {
  try {
    const connection = grafanaDbConnection.get();
    const isFolder = process.env.PG_HOST ? false : 0;

    // Get dashboard UIDs from Grafana database
    const results = await new Promise((resolve, reject) => {
      connection.query(
        `SELECT uid from dashboard where is_folder = ${isFolder}`,
        function (error, results) {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        },
      );
    });

    // Get stored GrafanaDashboards for this Grafana instance
    const storedGrafanaDashboardsForGrafanaInstance = await getGrafanaDashboardsForGrafanaInstance(grafana.label);

    // Filter stored dashboards that no longer exist in the Grafana instance
    let dashboardUids = process.env.PG_HOST ?
      results.rows.map((result) => result.uid)
    : results.map((result) => result.uid);

    let dashboardsMissing = storedGrafanaDashboardsForGrafanaInstance.filter(
      (storedDashboard) => {
        return dashboardUids.indexOf(storedDashboard.uid) === -1;
      },
    );

    let dashboardsToRestore = [];

    // Process each missing dashboard to check if it should be restored
    const promises = dashboardsMissing.map(async (missingDashboard) => {
      try {
        // Check if dashboards are used for application
        const applicationDashboards = await getApplicationDashboardsByUid(missingDashboard.uid);
        
        if (
          applicationDashboards.length > 0 ||
          (missingDashboard.grafanaJson &&
            missingDashboard.grafanaJson.dashboard &&
            missingDashboard.grafanaJson.dashboard.tags.indexOf(
              'perfana-template',
            ) !== -1)
        ) {
          // Create template dashboards from fixture data
          dashboardsToRestore.push(missingDashboard);
        }
      } catch (error) {
        logger.logError(error, `Failed to check application dashboards for ${missingDashboard.uid}`);
      }
    });

    await Promise.allSettled(promises);
    return dashboardsToRestore;
  } catch (error) {
    logger.logError(error, "Failed to restore dashboard");
    return [];
  }
};
