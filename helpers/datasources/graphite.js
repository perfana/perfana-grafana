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

module.exports.getGraphiteVariables = async (
  grafana,
  grafanaDashboard,
  datasource,
  variable,
  systemUnderTestQuery,
) => {
  const queryUrl =
    '/api/datasources/proxy/uid/' +
    datasource.uid +
    '/metrics/find?query=' +
    systemUnderTestQuery;

  let variableValues = [];

  try {
    // console.log('queryUrl: ' + queryUrl)
    const variableValuesResponse = await grafanaApiGet(grafana, queryUrl);
    // console.log('graphite values response: ' + JSON.stringify(variableValuesResponse))
    if (variableValuesResponse) {
      variableValuesResponse.forEach((value) => {
        let variableValue = value.text;

        if (variable.regex && variable.regex !== '') {
          try {
            let valueRegex = new RegExp(variable.regex.slice(1, -1)); // remove '/' from start and end

            let matches = variableValue.match(valueRegex);

            if (matches && variableValues.indexOf(variableValue) === -1) {
              variableValues.push(variableValue);
            }
          } catch (regexError) {
            logger.warn(`Invalid regex pattern in variable "${variable.name}": ${variable.regex}`, regexError);
            // Fallback: treat as literal string match
            if (variableValues.indexOf(variableValue) === -1) {
              variableValues.push(variableValue);
            }
          }
        } else {
          if (variableValues.indexOf(variableValue) === -1)
            variableValues.push(variableValue);
        }
      });
    }

    // console.log('variableValues: ' + JSON.stringify(variableValues))

    return variableValues;
  } catch (err) {
    logger.error(
      `Error getting values for query "${queryUrl}" for variable "${variable.name}" in dashboard "${grafanaDashboard.name}" from grafana instance "${grafana.label}"`,
      err
    );
    throw err;
  }
};
