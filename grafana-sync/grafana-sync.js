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
  updateTemplateDashboardInstances,
} = require('./update-dashboards/update-template-dashboard-instances');
const {
  getTemplateDashboardsInstancesToUpdate,
} = require('./update-dashboards/get-template-dashboard-instances-to-update');

const {
  getDashboardsToRestore,
} = require('./restore-dashboard/get-dashboards-to-restore');

const {
  getDashboardsToUpdate,
} = require('./update-dashboards/get-dashboards-to-update');
const {
  updateChildCollections,
} = require('./update-dashboards/update-child-collections');
const {
  getDashboardsToAdd,
} = require('./store-dashboard/get-dashboards-to-add');

const { getGrafanaInstances } = require('../helpers/perfana-mongo');

const { grafanaApiGet } = require('../helpers/grafana-api');

const { storeDashboard } = require('./store-dashboard/store-dashboard');

const { restoreDashboard } = require('./restore-dashboard/restore-dashboard');

const AutoConfigService = require('../auto-config/auto-config-service');

module.exports = async () => {
  try {
    const grafanaInstances = await getGrafanaInstances();
    
    // Process all Grafana instances
    const instancePromises = grafanaInstances.map(async (grafana) => {
      try {
        // Adding new dashboards
        logger.logSync('Adding new dashboards', grafana);
        const dashboardsToSync = await getDashboardsToAdd(grafana);
        
        const addDashboards = dashboardsToSync.map(async (dashboardToSync) => {
          try {
            return await syncDashboard(grafana, dashboardToSync, false);
          } catch (err) {
            logger.logError(err, `Failed to add dashboard ${dashboardToSync.uid}`);
            return undefined;
          }
        });
        
        await Promise.allSettled(addDashboards);

        // Updating existing dashboards
        logger.logSync('Updating existing dashboards', grafana);
        const dashboardsToUpdate = await getDashboardsToUpdate(grafana);
        
        const updateDashboards = dashboardsToUpdate.map(async (dashboardToUpdate) => {
          try {
            if (dashboardToUpdate.usedBySUT && dashboardToUpdate.usedBySUT.length > 0) {
              return await syncDashboard(
                grafana,
                dashboardToUpdate.perfanaDashboard,
                true,
                dashboardToUpdate.usedBySUT,
              );
            } else {
              return await syncDashboard(
                grafana,
                dashboardToUpdate.perfanaDashboard,
                true,
              );
            }
          } catch (err) {
            logger.logError(err, `Failed to update dashboard ${dashboardToUpdate.perfanaDashboard?.uid}`);
            return undefined;
          }
        });
        
        await Promise.allSettled(updateDashboards);

        // Restoring missing dashboards
        logger.logSync('Restoring missing dashboards', grafana);
        const dashboardsToRestore = await getDashboardsToRestore(grafana);
        
        const restoreDashboards = dashboardsToRestore.map(async (dashboardToRestore) => {
          try {
            return await restoreDashboard(grafana, dashboardToRestore);
          } catch (err) {
            logger.logError(err, `Failed to restore dashboard ${dashboardToRestore.uid}`);
            return undefined;
          }
        });
        
        await Promise.allSettled(restoreDashboards);

        // Updating template dashboard instances
        logger.logSync('Updating template dashboard instances', grafana);
        const updateSpecs = await getTemplateDashboardsInstancesToUpdate(grafana);
        
        // Process template updates sequentially to avoid overwhelming the system
        for (const updateSpec of updateSpecs) {
          try {
            await updateTemplateDashboardInstances(grafana, updateSpec);
          } catch (err) {
            logger.logError(err, 'Failed to update template dashboard instance');
          }
        }
      } catch (err) {
        logger.logError(err, `Failed processing Grafana instance ${grafana.label}`);
      }
    });

    await Promise.allSettled(instancePromises);
    
    // Run auto-configuration after all Grafana instances have been processed
    try {
      logger.info('Starting auto-configuration process');
      const autoConfigService = new AutoConfigService();
      await autoConfigService.processAutoConfigDashboards();
    } catch (err) {
      logger.logError(err, 'Auto-configuration process failed');
      // Continue with the next sync cycle even if auto-config fails
    }
  } catch (err) {
    logger.logError(err, 'Failed to get dashboards from Grafana API');
  }
};

const syncDashboard = async (grafana, perfanaDashboard, update, usedBySUT) => {
  try {
    // get dashboard details via Grafana http api
    // logger.debug(`Get dashboard ${perfanaDashboard.title} from Grafana API, uid: ${perfanaDashboard.uid}`);

    const grafanaDashboardApiObject = await grafanaApiGet(
      grafana, 
      '/api/dashboards/uid/' + perfanaDashboard.uid
    );

    // Store dashboard
    const grafanaDashboard = await storeDashboard(
      grafana, 
      grafanaDashboardApiObject, 
      update, 
      usedBySUT
    );

    // update child collections
    if (update === true) {
      updateChildCollections(grafanaDashboard);
    }

    return grafanaDashboard;
  } catch (err) {
    logger.logError(err, 'Storing dashboard failed');
    throw err;
  }
};
