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

const { grafanaApiGet } = require('../helpers/grafana-api');
const { storeTemplatingValue } = require('../helpers/perfana-mongo');
const { storeInfluxVariables } = require('../helpers/datasources/influxdb');
const {
  storePrometheusVariables,
} = require('../helpers/datasources/prometheus');
const logger = require('../helpers/logger');

module.exports.storeTemplatingValues = async (
  grafana,
  grafanaDashboard,
  grafanaDashboardApiObject,
) => {
  // get variables

  if (grafanaDashboardApiObject.dashboard.templating) {
    // const variablePlaceholder = new RegExp('\\$[a-zA-Z0-9]+', 'g'); // Variable placeholder pattern
    const variablePlaceholder = new RegExp('\\$[^/]+', 'g'); // Variable placeholder pattern

    let variables = grafanaDashboardApiObject.dashboard.templating.list.map(
      (templatingVariable) => ({
        name: templatingVariable.name,
        type: templatingVariable.type,
        options: templatingVariable.options,
        datasource:
          templatingVariable.datasource ? templatingVariable.datasource : '',
        regex: templatingVariable.regex ? templatingVariable.regex : '',
        query: templatingVariable.query.replace(variablePlaceholder, '.*'), // replace any templating variables with .*
      }),
    );

    // store values for variables

    for (const variable of variables) {
      switch (variable.type) {
        case 'interval':
        case 'constant':
        case 'custom':
          // store options in db

          variable.options &&
            variable.options.forEach((option) => {
              storeTemplatingValue(
                grafanaDashboard.grafana,
                grafanaDashboard.uid,
                variable.name,
                option.value,
              );
            });

          break;

        case 'query':
          try {
            let datasource;
            if (variable.datasource.uid) {
              // get datasource
              datasource = await grafanaApiGet(
                grafana,
                '/api/datasources/uid/' + variable.datasource.uid,
              );
            } else {
              // get datasource
              datasource = await grafanaApiGet(
                grafana,
                '/api/datasources/name/' + variable.datasource,
              );
            }

            switch (datasource.type) {
              case 'influxdb':
                await storeInfluxVariables(
                  grafana,
                  grafanaDashboard,
                  datasource,
                  variable,
                );
                break;

              case 'prometheus':
                await storePrometheusVariables(
                  grafana,
                  grafanaDashboard,
                  datasource,
                  variable,
                );
                break;

              case 'graphite':
              // storeGraphiteVariables()
              // break;

              default:
                logger.error(
                  `Datasource of type ${datasource.type} not supported`,
                );
            }
          } catch (err) {
            const datasourceId = variable.datasource.uid || variable.datasource;
            logger.error(
              `##### Error getting datasource "${datasourceId}" for variable "${variable.name}" in dashboard "${grafanaDashboardApiObject.dashboard.title}", ${err}`,
            );
          }
          break;

        default:
          logger.error(`Variable of type ${variable.type} not supported`);
      }
    }
  }
};
