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
} = require('../../helpers/perfana-mongo');
const logger = require('../../helpers/logger');

const Random = require('meteor-random');

const grafanaDbConnection = require('../../helpers/grafanaDb');

const moment = require('moment');

module.exports.getDashboardsToUpdate = async (grafana) => {
  try {
    // console.log(`##### Getting dashboards from Grafana instance "${grafana.label}"`)

    const storedGrafanaDashboardsForGrafanaInstance = await getGrafanaDashboardsForGrafanaInstance(grafana.label);
    
    let timestampLastSync = moment(
      new Date(new Date().getTime() - 60 * 60 * 1000),
    )
      .utc()
      .format('YYYY-MM-DD HH:mm:ss');

    // console.log(`Timestamp Last Sync: ${timestampLastSync}`);

    let connection = grafanaDbConnection.get();

    const updatedDashboards = await new Promise((resolve, reject) => {
      connection.query(
        `SELECT uid from dashboard where updated > '${timestampLastSync}'`,
        function (error, result) {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        },
      );
    });

    let dashboardUids =
      process.env.PG_HOST ?
        updatedDashboards.rows.map((result) => result.uid)
      : updatedDashboards.map((result) => result.uid);

    if (dashboardUids.length == 0) {
      logger.info('No dashboards updated during the last hour', { grafanaInstance: grafana.label });
      return [];
    }

    let dashboardUidsQueryString = '';
    dashboardUids.forEach((dashboardUid, index) => {
      if (index == 0) {
        dashboardUidsQueryString += `dashboardUIDs=${dashboardUid}`;
      } else {
        dashboardUidsQueryString += `&dashboardUIDs=${dashboardUid}`;
      }
    });

    try {
      const dashboards = await grafanaApiGet(
        grafana,
        `/api/search?${dashboardUidsQueryString}`,
      );

      // Filter dashboards with tag "Perfana" that are not yet stored
      let dashboardsToSync = [];

      let perfanaDashboards = dashboards.filter(
        (dashboard) =>
          dashboard.tags
            .map((tag) => tag.toLowerCase())
            .indexOf('perfana') !== -1,
      );

      const parallelGetDashboardCalls =
        process.env.PARALLEL_GET_DASHBOARD_CALLS ?
          parseInt(process.env.PARALLEL_GET_DASHBOARD_CALLS)
        : 20;

      // Process dashboards in batches to respect the parallel limit
      const batchSize = parallelGetDashboardCalls;
      for (let i = 0; i < perfanaDashboards.length; i += batchSize) {
        const batch = perfanaDashboards.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (perfanaDashboard) => {
          try {
            const perfanaDashboardDetails = await grafanaApiGet(
              grafana,
              `/api/dashboards/uid/${perfanaDashboard.uid}`,
            );

            let storedDashboards = storedGrafanaDashboardsForGrafanaInstance.filter(
              (storedDashboard) => {
                return storedDashboard.uid === perfanaDashboard.uid;
              },
            );

            // if "updated" property of Dashboard in Grafana > for stored dashboard, sync it
            if (storedDashboards.length > 0) {
              if (
                new Date(storedDashboards[0].updated) <
                new Date(perfanaDashboardDetails.meta.updated)
              ) {
                return {
                  perfanaDashboard: perfanaDashboard,
                  usedBySUT:
                    storedDashboards[0].usedBySUT ?
                      storedDashboards[0].usedBySUT
                    : [],
                };
              }
            }
            return null;
          } catch (err) {
            logger.logError(err, `Failed to update dashboard ${perfanaDashboard.uid}`);
            return null;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        // Collect successful results
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            dashboardsToSync.push(result.value);
          }
        });
      }

      if (dashboardsToSync.length > 0) {
        logger.info(
          `Dashboards to update: ${JSON.stringify(
            dashboardsToSync.map(
              (dashboard) => dashboard.perfanaDashboard.title,
            ),
          )}`,
          { grafanaInstance: grafana.label }
        );
      }

      return dashboardsToSync;
    } catch (err) {
      logger.logError(err, "Failed to update dashboards");
      return [];
    }
  } catch (err) {
    logger.logError(err, "Failed to get stored dashboards for update");
    return [];
  }
};
