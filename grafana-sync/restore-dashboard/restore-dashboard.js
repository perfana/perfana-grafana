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

const logger = require('../../helpers/logger');
const { removeGrafanaDashboard } = require('../../helpers/perfana-mongo');

const { grafanaApiPost } = require('../../helpers/grafana-api');

module.exports.restoreDashboard = async (grafanaInstance, grafanaDashboard) => {
  try {
    //convert grafanaJson to object
    grafanaDashboard.grafanaJson = JSON.parse(grafanaDashboard.grafanaJson);

    // delete id
    delete grafanaDashboard.grafanaJson.dashboard.id;
    // set folder id, get it from meta data
    grafanaDashboard.grafanaJson.folderId =
      grafanaDashboard.grafanaJson.meta.folderId;
    // delete meta
    delete grafanaDashboard.grafanaJson.meta;

    await grafanaApiPost(
      grafanaInstance,
      '/api/dashboards/db',
      grafanaDashboard.grafanaJson,
    );
    
    const event = 'Restored dashboard';
    let message = `${event} "${grafanaDashboard.grafanaJson.dashboard.title}" for Grafana instance "${grafanaInstance.label}"`;
    logger.info(message);
  } catch (err) {
    const event = 'Failed restoring dashboard';
    let message = `${event} "${grafanaDashboard.grafanaJson.dashboard.title}" for Grafana instance "${grafanaInstance.label} due to ${err}"`;

    if (message.includes('statusCode: 412')) {
      // when pre-conditions cause restore to fail, delete dashboard from perfana db
      try {
        await removeGrafanaDashboard(grafanaDashboard._id);
        message = `Dashboard "${grafanaDashboard.name}" removed from Perfana database, because the it could not be restores in Grafana instance "${grafanaInstance.label}"`;
        logger.info(message);
      } catch (removeErr) {
        logger.error('Failed to remove dashboard from Perfana database', removeErr);
      }
    }

    logger.info(message);
  }
};
