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

const _ = require('lodash');
const { grafanaApiGet } = require('../../helpers/grafana-api');
const {
  getGrafanaDashboardsForGrafanaInstance,
  getTemplateGrafanaDashboardInstancesForGrafanaInstance,
  getAutoconfigDashboardsByUidAndProfile,
} = require('../../helpers/perfana-mongo');

const Random = require('meteor-random');

const { getGrafanaDashboardByUid } = require('../../helpers/perfana-mongo');
const grafanaDbConnection = require('../../helpers/grafanaDb');
const { propagateTemplateUpdates } = require('../../config/default');
const logger = require('../../helpers/logger');

module.exports.getTemplateDashboardsInstancesToUpdate = async (grafana) => {
  if (propagateTemplateUpdates === false) {
    return [];
  }

  try {
    // Get dashboards list via Grafana database query
    const connection = grafanaDbConnection.get();
    
    const storedDashboards = await new Promise((resolve, reject) => {
      connection.query(
        `SELECT * from dashboard`,
        function (error, storedDashboards) {
          if (error) {
            reject(error);
          } else {
            resolve(storedDashboards);
          }
        },
      );
    });

    // Filter template dashboards
    let dashboards = process.env.PG_HOST ? storedDashboards.rows : storedDashboards;

    let perfanaTemplateDashboardsUids = dashboards
      .filter(
        (dashboard) =>
          dashboard.tags &&
          dashboard.tags
            .map((tag) => tag.toLowerCase())
            .indexOf('perfana-template') !== -1,
      )
      .map((templateDashboard) => templateDashboard.uid);

    // Get stored GrafanaDashboard instances based on template dashboards
    const storedGrafanaDashboardsForGrafanaInstance = await getTemplateGrafanaDashboardInstancesForGrafanaInstance(
      grafana.label,
      perfanaTemplateDashboardsUids,
    );

    let updateSpecs = [];

    if (storedGrafanaDashboardsForGrafanaInstance.length === 0) {
      return updateSpecs;
    }

    // Filter dashboards with tag "Perfana" that are not yet stored
    let perfanaDashboards = dashboards.filter(
      (dashboard) =>
        dashboard.tags
          .map((tag) => tag.toLowerCase())
          .indexOf('perfana-template') !== -1,
    );

    // Process each perfana dashboard sequentially
    for (const perfanaDashboard of perfanaDashboards) {
      try {
        const perfanaDashboardDetails = await grafanaApiGet(
          grafana,
          `/api/dashboards/uid/${perfanaDashboard.uid}`,
        );

        for (const storedGrafanaDashboardForGrafanaInstance of storedGrafanaDashboardsForGrafanaInstance) {
          if (
            storedGrafanaDashboardForGrafanaInstance.templateDashboardUid ===
            perfanaDashboard.uid
          ) {
            try {
              const autoConfigGrafanaDashboards = await getAutoconfigDashboardsByUidAndProfile(
                perfanaDashboard.uid,
                storedGrafanaDashboardForGrafanaInstance.templateProfile,
              );

              const autoConfigGrafanaDashboard = autoConfigGrafanaDashboards?.[0];

              if (autoConfigGrafanaDashboard) {
                try {
                  const grafanaTemplateDashboard = await getGrafanaDashboardByUid(
                    grafana.label,
                    autoConfigGrafanaDashboard.dashboardUid,
                  );

                  if (grafanaTemplateDashboard) {
                    grafanaTemplateDashboard.grafanaJson =
                      JSON.parse(grafanaTemplateDashboard.grafanaJson);

                    grafanaTemplateDashboard.grafanaJson.dashboard.version =
                      parseInt(grafanaTemplateDashboard.grafanaJson.dashboard.version) + 1;

                    if (
                      storedGrafanaDashboardForGrafanaInstance.updated <
                        new Date(perfanaDashboardDetails.meta.updated) &&
                      new Date(storedGrafanaDashboardForGrafanaInstance.updated) <=
                        new Date(storedGrafanaDashboardForGrafanaInstance.templateCreateDate)
                    ) {
                      updateSpecs.push({
                        autoConfigGrafanaDashboard: autoConfigGrafanaDashboard,
                        grafanaTemplateDashboard: grafanaTemplateDashboard,
                        dashboard: storedGrafanaDashboardForGrafanaInstance,
                        update: perfanaDashboardDetails,
                        grafanaInstance: grafana,
                      });
                    }
                  }
                } catch (err) {
                  logger.logError(err, "Failed to get grafana template dashboard");
                }
              }
            } catch (err) {
              logger.logError(err, "Failed to get autoconfig dashboard by uid and profile");
            }
          }
        }
      } catch (err) {
        logger.logError(err, `Failed to get dashboard details for ${perfanaDashboard.uid}`);
      }
    }

    return updateSpecs;
  } catch (error) {
    logger.logError(error, "Failed to get template dashboard instances");
    return [];
  }
};
