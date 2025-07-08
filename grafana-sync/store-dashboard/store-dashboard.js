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
const { grafanaApiGet } = require('../../helpers/grafana-api');
const {
  upsertGrafanaDashboard,
  getGrafanaDashboardByUid,
} = require('../../helpers/perfana-mongo');
const logger = require('../../helpers/logger');

const Random = require('meteor-random');

module.exports.storeDashboard = async (
  grafanaInstance,
  grafanaDashboardApiObject,
  update,
  usedBySUT,
  autoConfigGrafanaDashboard,
  applicationDashboardVariables,
  testRun,
) => {
  try {
    // check if grafanaDashboard has already been stored and if so return it
    const storedGrafanaDashboard = await getGrafanaDashboardByUid(
      grafanaInstance.label,
      grafanaDashboardApiObject.dashboard.uid,
    );

    if (storedGrafanaDashboard && update === false) {
      return storedGrafanaDashboard;
    }

    // get first panel of type graph
    let firstGraphPanel = grafanaDashboardApiObject.dashboard.panels.filter((panel) => {
      return (
        panel.type === 'graph' ||
        panel.type === 'timeseries' ||
        panel.type === 'table' ||
        panel.type === 'flamegraph'
      );
    })[0];

    // get datasource
    let datasource;
    try {
      if (firstGraphPanel.datasource.uid) {
        datasource = await grafanaApiGet(
          grafanaInstance,
          '/api/datasources/uid/' + firstGraphPanel.datasource.uid,
        );
      } else {
        datasource = await grafanaApiGet(
          grafanaInstance,
          '/api/datasources/name/' + firstGraphPanel.datasource,
        );
      }
    } catch (err) {
      const datasourceIdentifier = firstGraphPanel.datasource.uid || firstGraphPanel.datasource;
      logger.error(
        `##### Error getting datasource "${datasourceIdentifier}" for panel "${firstGraphPanel.title}" in dashboard "${grafanaDashboardApiObject.dashboard.title}", ${err}`,
      );
      throw err;
    }

    const grafanaDashboard = {
      grafana: grafanaInstance.label,
      name: grafanaDashboardApiObject.dashboard.title,
      datasourceType: datasource.type,
      uri: grafanaDashboardApiObject.meta.url,
      id: grafanaDashboardApiObject.dashboard.id,
      uid: grafanaDashboardApiObject.dashboard.uid,
      tags: grafanaDashboardApiObject.dashboard.tags,
      slug: grafanaDashboardApiObject.meta.slug,
      templateDashboardUid:
        autoConfigGrafanaDashboard ?
          autoConfigGrafanaDashboard.dashboardUid
        : undefined,
      templateProfile:
        autoConfigGrafanaDashboard ?
          autoConfigGrafanaDashboard.profile
        : undefined,
      templateTestRunVariables:
        testRun ? testRun.variables : undefined,
      templateCreateDate: new Date(),
      applicationDashboardVariables:
        applicationDashboardVariables ?
          applicationDashboardVariables
        : undefined,
      panels: [],
      variables: [],
      updated: new Date(),
      grafanaJson: JSON.stringify(grafanaDashboardApiObject),
    };

    // if update remove templateCreateDate
    if (update === true) {
      delete grafanaDashboard.templateCreateDate;
      delete grafanaDashboard._id;
    }

    // if this is a new dashboard, generate random _id
    if (!update) {
      grafanaDashboard['_id'] = Random.secret();
    }

    // Add templating variables
    if (grafanaDashboardApiObject.dashboard.templating) {
      let variables = grafanaDashboardApiObject.dashboard.templating.list.map(
        (templatingVariable) => ({
          name: templatingVariable.name,
          type: templatingVariable.type,
          options:
            templatingVariable.regex ?
              templatingVariable.options
            : undefined,
          datasource:
            templatingVariable.datasource ?
              templatingVariable.datasource
            : undefined,
          regex:
            templatingVariable.regex ?
              templatingVariable.regex
            : undefined,
          query: templatingVariable.query, //.replace(variablePlaceholder, '.*') // replace any templating variables with .*
        }),
      );

      grafanaDashboard.templatingVariables = variables;

      variables.forEach((variable) => {
        grafanaDashboard.variables.push({
          name: variable.name,
        });
      });
    }

    if (grafanaDashboardApiObject.dashboard.panels) {
      grafanaDashboardApiObject.dashboard.panels
        .filter((panel) => {
          // return !_.has(panel, 'repeatIteration') && panel.type === 'graph' && _.has(panel, 'datasource')
          return (
            !_.has(panel, 'repeatIteration') &&
            _.has(panel, 'datasource')
          );
        })
        .map((panel) => {
          grafanaDashboard.panels.push({
            id: panel.id,
            title: panel.title,
            type: panel.type,
            description: panel.description,
            yAxesFormat:
              (
                panel.fieldConfig &&
                panel.fieldConfig.defaults &&
                panel.fieldConfig.defaults.unit
              ) ?
                panel.fieldConfig.defaults.unit
              : panel.yaxes && panel.yaxes[0].format ?
                panel.yaxes[0].format
              : undefined,
            repeat:
              panel.repeat !== 'null' ? panel.repeat : undefined,
          });
        });
    }

    grafanaDashboard.usedBySUT = usedBySUT ? usedBySUT : [];

    try {
      await upsertGrafanaDashboard(grafanaDashboard);
      const event = update ? 'Updated dashboard' : 'Added dashboard';
      const message = `${event} ${grafanaDashboard.name} from Grafana instance ${grafanaInstance.label}`;
      logger.info(message);
      return grafanaDashboard;
    } catch (err) {
      const event = update ? 'Failed updating dashboard' : 'Failed adding dashboard';
      let message = `${event} "${grafanaDashboard.name}" for Grafana instance "${grafanaInstance.label}"`;
      logger.error(message);
      throw err;
    }
  } catch (err) {
    logger.error(
      `##### Error getting dashboard "${grafanaDashboardApiObject.dashboard.title} by uid", ${err}`,
    );
    throw err;
  }
};
