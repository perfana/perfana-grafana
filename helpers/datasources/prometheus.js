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
const _ = require('lodash');
const { JSONPath } = require('jsonpath-plus');
const {
  prometheusVariablesQueryTimeRangeDays,
} = require('../../config/default');
const logger = require('../logger');

module.exports.getPrometheusVariables = async (
  grafana,
  grafanaDashboard,
  datasource,
  variable,
  systemUnderTestQuery,
) => {
  let queryUrl;

  const queryRegex = new RegExp('label_values\\((.*),\\s*([^\)]+)\\)');

  if (queryRegex.test(systemUnderTestQuery)) {
    let metric = queryRegex.exec(systemUnderTestQuery)[1];

    queryUrl =
      '/api/datasources/proxy/uid/' +
      datasource.uid +
      '/api/v1/series?match[]=' +
      metric +
      '&start=' +
      Math.round(
        new Date(
          new Date().setDate(
            new Date().getDate() - prometheusVariablesQueryTimeRangeDays,
          ),
        ).getTime() / 1000,
      ) +
      '&end=' +
      Math.round(new Date().getTime() / 1000);
  } else {
    queryUrl =
      '/api/datasources/proxy/uid/' +
      datasource.uid +
      '/api/v1/label/' +
      variable.name +
      '/values';
  }

  let variableValues = [];

  try {
    const variableValuesResponse = await grafanaApiGet(grafana, queryUrl);
    // const maxSeries = process.env.MAX_SERIES || 20

    if (queryRegex.test(systemUnderTestQuery)) {
      let property = queryRegex.exec(systemUnderTestQuery)[2];

      // console.log(JSON.stringify(valuesResponse))
      _.each(
        _.uniq(
          JSONPath({
            json: variableValuesResponse,
            path: '$.data[*].' + property,
          }),
        ),
        (variableValue) => {
          let valueAfterRegex = '';

          if (variable.regex && variable.regex !== '') {
            try {
              let valueRegex = new RegExp(variable.regex.slice(1, -1));
              let matches = variableValue.match(valueRegex);

              _.each(matches, (match, i) => {
                if (i > 0) valueAfterRegex += match;
              });
            } catch (regexError) {
              logger.warn(`Invalid regex pattern in variable "${variable.name}": ${variable.regex}`, regexError);
              // Fallback: use original value
              valueAfterRegex = variableValue;
            }
          }

          let pushValue =
            valueAfterRegex !== '' ? valueAfterRegex : variableValue;
          if (variableValues.indexOf(pushValue) === -1)
            variableValues.push(pushValue);
        },
      );
    } else {
      _.each(variableValuesResponse.data, (variableValue) => {
        if (variable.regex && variable.regex !== '') {
          try {
            let valueRegex = new RegExp(variable.regex.slice(1, -1)); // remove '/' from start and end

            let matches = variableValue.match(valueRegex);

            if (matches && variableValues.indexOf(variableValue) === -1) {
              variableValues.push(variableValue);
            }
          } catch (regexError) {
            logger.warn(`Invalid regex pattern in variable "${variable.name}": ${variable.regex}`, regexError);
            // Fallback: include value without regex filtering
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

    return variableValues;
  } catch (err) {
    logger.error(
      `##### Error getting values for query "${queryUrl}" for variable "${variable.name}" in dashboard "${grafanaDashboard.name}" from grafana instance "${grafana.label}", ${err.stack}`,
    );
    throw err;
  }
};
