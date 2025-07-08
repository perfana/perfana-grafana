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

const { grafanaApiGet } = require('../../helpers/grafana-api');
const {
  getGrafanaDashboardsForGrafanaInstance,
} = require('../../helpers/perfana-mongo');
const logger = require('../../helpers/logger');

const grafanaDbConnection = require('../../helpers/grafanaDb');
const moment = require('moment');

module.exports.getDashboardsToAdd = async (grafana) => {
  try {
    let timestampLastSync = moment(
      new Date(new Date().getTime() - 24 * 60 * 60 * 1000),
    )
      .utc()
      .format('YYYY-MM-DD HH:mm:ss');

    // console.log(`Timestamp Last Sync: ${timestampLastSync}`);

    let connection = grafanaDbConnection.get();

    let query =
      process.env.PG_HOST ?
        `SELECT DISTINCT uid
       FROM ${process.env.PG_SCHEMA ? process.env.PG_SCHEMA : 'public'}.dashboard
              LEFT OUTER JOIN ${process.env.PG_SCHEMA ? process.env.PG_SCHEMA : 'public'}.dashboard_tag ON dashboard.id = dashboard_tag.dashboard_id
       WHERE dashboard_tag.term ILIKE '%perfana-template%' 
       OR dashboard.created > '${timestampLastSync}'
      `
      : `SELECT DISTINCT uid
       FROM dashboard
              LEFT OUTER JOIN dashboard_tag ON dashboard.id = dashboard_tag.dashboard_id
       WHERE LOWER(dashboard_tag.term) LIKE '%perfana-template%'
          OR dashboard.created > '${timestampLastSync}'
      `;

    // console.log(query);

    const createdDashboards = await new Promise((resolve, reject) => {
      connection.query(query, function (error, result) {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });

    let dashboardUids =
      process.env.PG_HOST ?
        createdDashboards.rows.map((result) => result.uid)
      : createdDashboards.map((result) => result.uid);

    if (dashboardUids.length === 0) {
      logger.info('No dashboards added in the last 24 hours', { grafanaInstance: grafana.label });
      return [];
    }

    let dashboardUidsQueryString = '';
    dashboardUids.forEach((dashboardUid, index) => {
      if (index === 0) {
        dashboardUidsQueryString += `dashboardUIDs=${dashboardUid}`;
      } else {
        dashboardUidsQueryString += `&dashboardUIDs=${dashboardUid}`;
      }
    });

    try {
      const dashboards = await grafanaApiGet(grafana, `/api/search?${dashboardUidsQueryString}`);
      
      // Get stored GrafanaDashboards for this Grafana instance
      const storedGrafanaDashboardsForGrafanaInstance = await getGrafanaDashboardsForGrafanaInstance(grafana.label);
      
      // Filter dashboards with tag "Perfana" that are not yet stored
      let perfanaDashboards = dashboards
        .filter(
          (dashboard) =>
            dashboard.tags
              .map((tag) => tag.toLowerCase())
              .indexOf('perfana') !== -1,
        )
        .filter(
          (perfanaDashboard) =>
            storedGrafanaDashboardsForGrafanaInstance
              .map((storedDashboard) => storedDashboard.uid)
              .indexOf(perfanaDashboard.uid) === -1,
        );

      if (perfanaDashboards.length > 0) {
        logger.info(
          `Dashboards to add: ${JSON.stringify(perfanaDashboards.map((dashboard) => dashboard.title))}`,
          { grafanaInstance: grafana.label }
        );
      } else {
        logger.info('No dashboards to add', { grafanaInstance: grafana.label });
      }

      return perfanaDashboards;
    } catch (err) {
      logger.logError(err, "Failed to retrieve dashboard data");
      return [];
    }
  } catch (error) {
    logger.logError(error, "Failed to query database for dashboard UIDs");
    return [];
  }
};
