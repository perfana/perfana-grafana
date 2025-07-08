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
  updateApplicationDashboard,
  getApplicationDashboardsByUid,
  getBenchmarksByUid,
  updateBenchmark,
} = require('../../helpers/perfana-mongo');
const logger = require('../../helpers/logger');

module.exports.updateChildCollections = async (grafanaDashboard) => {
  try {
    // get ApplicationDashboards based on the grafanaDashboard
    const applicationDashboards = await getApplicationDashboardsByUid(grafanaDashboard.uid);
    
    for (const applicationDashboard of applicationDashboards) {
      logger.info(
        `Updating title for application dashboard: "${applicationDashboard.dashboardName}" to "${grafanaDashboard.name}"`,
      );

      await updateApplicationDashboard(applicationDashboard, grafanaDashboard);
    }
  } catch (error) {
    logger.error(`Error updating application dashboards for ${grafanaDashboard.uid}:`, error);
  }

  try {
    // update KPI's panels
    const benchmarks = await getBenchmarksByUid(grafanaDashboard.uid);
    
    for (const benchmark of benchmarks) {
      logger.info(
        `Updating KPI for panel "${benchmark.panel.title}" for dashboard label "${benchmark.dashboardLabel}" for system under test "${benchmark.application}"`,
      );

      let updatePanel = grafanaDashboard.panels.filter((panel) => {
        return benchmark.panel.id === panel.id;
      })[0];

      if (
        updatePanel &&
        benchmark.title !== `${updatePanel.id}-${updatePanel.title}`
      ) {
        benchmark.panel.title = `${updatePanel.id}-${updatePanel.title}`;

        await updateBenchmark(benchmark);
      }
    }
  } catch (error) {
    logger.error(`Error updating benchmarks for ${grafanaDashboard.uid}:`, error);
  }
};
