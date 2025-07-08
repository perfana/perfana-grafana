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

const { grafanaApiGet } = require('../grafana-api');
const logger = require('../logger');

module.exports.getInfluxVariables = async (
  grafana,
  grafanaDashboard,
  datasource,
  variable,
  systemUnderTestQuery,
) => {
  const queryUrl =
    '/api/datasources/proxy/uid/' +
    datasource.uid +
    '/query?db=' +
    datasource.database +
    '&q=' +
    systemUnderTestQuery;

  let variableValues = [];

  try {
    const variableValuesResponse = await grafanaApiGet(grafana, queryUrl);
    if (variableValuesResponse.results) {
      variableValuesResponse.results.forEach((result) => {
        if (result.series) {
          result.series.forEach((serie) => {
            if (serie.values) {
              serie.values.forEach((value) => {
                let variableValue =
                  value.length === 1 ? value[0] : value[1]; // if query == 'show measurements' values come in array of single strings

                if (variable.regex && variable.regex !== '') {
                  let valueRegex = new RegExp(variable.regex.slice(1, -1)); // remove '/' from start and end

                  let matches = variableValue.match(valueRegex);

                  if (
                    matches &&
                    variableValues.indexOf(variableValue) === -1
                  ) {
                    variableValues.push(variableValue);
                  }
                } else {
                  if (variableValues.indexOf(variableValue) === -1)
                    variableValues.push(variableValue);
                }
              });
            }
          });
        }
      });
    }

    return variableValues;
  } catch (err) {
    logger.error(
      `##### Error getting values for query "${queryUrl}" for variable "${variable.name}" in dashboard "${grafanaDashboard.name}" from grafana instance "${grafana.label}", ${err.stack}`,
    );
    throw err;
  }
};
