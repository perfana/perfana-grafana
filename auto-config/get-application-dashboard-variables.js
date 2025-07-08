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

const { matchValue } = require('./matchValue')
const { replaceDynamicVariableValues } = require('./replaceDynamicVariableValues')
const { escapeRegExp } = require('../helpers/utils')
const logger = require('../helpers/logger')

const {
  getInfluxVariables
} = require('../helpers/datasources/influxdb')
const {
  getPrometheusVariables
} = require('../helpers/datasources/prometheus')
const {
  getGraphiteVariables
} = require('../helpers/datasources/graphite')

const { grafanaApiGet } = require('../helpers/grafana-api')

/**
 * Get application dashboard variables from template dashboard
 * Converted from callback-based to async/await from original implementation
 */
async function getApplicationDashboardVariables(testRun, grafanaDashboard, autoConfigGrafanaDashboard, grafanaInstance) {

  // Set base variables for system_under_test and test_environment
  let applicationDashboardVariables = [{
    name: 'system_under_test',
    values: [testRun.application]
  },
  {
    name: 'test_environment',
    values: [testRun.testEnvironment]
  }];

  // Filter out templating variable 'system_under_test' and test_environment from Grafana dashboard
  if (grafanaDashboard.templatingVariables) {

    let templatingVariables = grafanaDashboard.templatingVariables.filter((templatingVariable) => {
      return templatingVariable.name !== 'system_under_test' && templatingVariable.name !== 'test_environment'
    })

    // Process each templating variable
    for (const templatingVariable of templatingVariables) {
      try {
        await getValuesFromDatasource(grafanaInstance, grafanaDashboard, testRun, templatingVariable, applicationDashboardVariables)
      } catch (err) {
        logger.logError(err, `Failed to get values for templating variable "${templatingVariable.name}" in dashboard "${grafanaDashboard.name}"`)
        // Continue processing other variables
      }
    }
  }

  // Apply overrides and regex filtering
  const overriddenVariables = overrideValues(applicationDashboardVariables, autoConfigGrafanaDashboard.setHardcodedValueForVariables, testRun)
  return filterValuesOnRegex(overriddenVariables, autoConfigGrafanaDashboard, testRun)
}

/**
 * Override variable values if set in configuration
 */
function overrideValues(applicationDashboardVariables, overrideValueForVariables, testRun) {

  if (overrideValueForVariables && overrideValueForVariables.length > 0) {

    applicationDashboardVariables.forEach((variable, variableIndex) => {

      overrideValueForVariables.forEach((overrideValueForVariable) => {

        if (variable.name === overrideValueForVariable.name) {

          applicationDashboardVariables[variableIndex].values = [];

          overrideValueForVariable.values.forEach((overrideValue) => {

            applicationDashboardVariables[variableIndex].values.push(replaceDynamicVariableValues(overrideValue, testRun));

          })
        }
      })
    })
  }

  return applicationDashboardVariables;
}

/**
 * Filter variable values based on regex patterns
 */
function filterValuesOnRegex(applicationDashboardVariables, autoConfigGrafanaDashboard, testRun) {

  if (autoConfigGrafanaDashboard.matchRegexForVariables && autoConfigGrafanaDashboard.matchRegexForVariables.length > 0) {

    applicationDashboardVariables.forEach((variable, variableIndex) => {

      autoConfigGrafanaDashboard.matchRegexForVariables.forEach((matchRegexForVariable) => {

        if (variable.name === matchRegexForVariable.name) {

          applicationDashboardVariables[variableIndex].values = applicationDashboardVariables[variableIndex].values.filter((value) => {

            return matchValue(autoConfigGrafanaDashboard.matchRegexForVariables, variable.name, value, testRun);

          })
        }
      })
    })
  }

  return applicationDashboardVariables;
}

/**
 * Get variable values from data source
 */
async function getValuesFromDatasource(grafanaInstance, grafanaDashboard, testRun, templatingVariable, applicationDashboardVariables) {

  // Replace system_under_test and test_environment placeholders in query
  let templatingVariableQuery = typeof templatingVariable.query === 'object' ? templatingVariable.query.query : templatingVariable.query;  // from grafana 7.4.x up query is an object

  let systemUnderTestQuery = templatingVariableQuery.replace('$system_under_test', testRun.application).replace('$test_environment', testRun.testEnvironment);

  // Replace other templating variables in query
  applicationDashboardVariables.forEach((applicationDashboardVariable) => {

    let placeholder = new RegExp('\\$' + escapeRegExp(applicationDashboardVariable.name), 'g');

    if (placeholder.test(templatingVariableQuery) && applicationDashboardVariable.name !== 'system_under_test' && applicationDashboardVariable.name !== 'test_environment') {

      let replaceValue = '';

      applicationDashboardVariable.values.forEach((applicationDashboardVariableValue, valueIndex) => {

        let value = (applicationDashboardVariableValue === 'All') ? '.*' : applicationDashboardVariableValue;

        if (valueIndex === 0) {
          replaceValue += value;
        } else {
          replaceValue += `|${value}`;
        }
      })

      systemUnderTestQuery = systemUnderTestQuery.replace(placeholder, replaceValue);
    }
  })

  let templatingVariableValues = [];

  switch (templatingVariable.type) {

    case 'constant':
      templatingVariableValues.push(templatingVariableQuery);

      applicationDashboardVariables.push({
        name: templatingVariable.name,
        values: templatingVariableValues
      })
      break;

    case 'interval':
    case 'custom':
      // Store options in db
      templatingVariableQuery && templatingVariableQuery.split(',').forEach((item) => {
        if (templatingVariableValues.indexOf(item) === -1) templatingVariableValues.push(item)
      })

      applicationDashboardVariables.push({
        name: templatingVariable.name,
        values: templatingVariableValues
      })
      break;

    case 'query':
      if (templatingVariable.datasource.uid) {
        // Get datasource by UID
        const datasource = await grafanaApiGet(grafanaInstance, '/api/datasources/uid/' + templatingVariable.datasource.uid);
        const values = await getVariableValuesFromDatasource(grafanaInstance, grafanaDashboard, datasource, templatingVariable, systemUnderTestQuery);
        
        applicationDashboardVariables.push({
          name: templatingVariable.name,
          values: values
        })

      } else {
        // Get datasource by name
        const datasource = await grafanaApiGet(grafanaInstance, '/api/datasources/name/' + templatingVariable.datasource);
        const values = await getVariableValuesFromDatasource(grafanaInstance, grafanaDashboard, datasource, templatingVariable, systemUnderTestQuery);
        
        applicationDashboardVariables.push({
          name: templatingVariable.name,
          values: values
        })
      }
      break;

    default:
      logger.warn(`Variable of type ${templatingVariable.type} not supported`)
  }
}

/**
 * Get variable values from specific datasource type
 */
async function getVariableValuesFromDatasource(grafanaInstance, grafanaDashboard, datasource, templatingVariable, query) {
  
  switch (datasource.type) {

    case 'influxdb':
      return await getInfluxVariables(grafanaInstance, grafanaDashboard, datasource, templatingVariable, query);

    case 'prometheus':
      return await getPrometheusVariables(grafanaInstance, grafanaDashboard, datasource, templatingVariable, query);

    case 'graphite':
      return await getGraphiteVariables(grafanaInstance, grafanaDashboard, datasource, templatingVariable, query);

    default:
      logger.warn(`Datasource of type ${datasource.type} not supported`)
      return [];
  }
}

module.exports = {
  getApplicationDashboardVariables
}