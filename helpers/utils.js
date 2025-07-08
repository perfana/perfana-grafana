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

// noinspection DuplicatedCode

const md5 = require('md5');

/**
 * Escape special regex characters to prevent ReDoS attacks
 * @param {string} string - String to escape
 * @returns {string} Escaped string safe for use in RegExp
 */
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports.createDashboardUid = (
  testRun,
  autoConfigGrafanaDashboard,
  applicationDashboardVariables,
) => {
  // if removeTemplatingVariables === true, include variables in the uid and title

  // noinspection JSUnresolvedReference
  if (autoConfigGrafanaDashboard.removeTemplatingVariables === true) {
    let flattenedApplicationDashboardVariables = '';
    applicationDashboardVariables.sort().forEach((variable) => {
      flattenedApplicationDashboardVariables += variable.name;
      variable.values.sort().forEach((value) => {
        flattenedApplicationDashboardVariables += value;
      });
    });

    // console.log(`flattenedApplicationDashboardVariables: ${flattenedApplicationDashboardVariables}`)
    // console.log('md5: ' + md5(`${testRun.application}${testRun.testEnvironment}${autoConfigGrafanaDashboard.grafana}${autoConfigGrafanaDashboard.dashboardUid}${flattenedApplicationDashboardVariables}`))

    return md5(
      `${testRun.application}${testRun.testEnvironment}${autoConfigGrafanaDashboard.grafana}${autoConfigGrafanaDashboard.dashboardUid}${flattenedApplicationDashboardVariables}`,
    );
  } else {
    return md5(
      `${testRun.application}${testRun.testEnvironment}${autoConfigGrafanaDashboard.grafana}${autoConfigGrafanaDashboard.dashboardUid}`,
    );
  }
};

// module.exports.filteredApplicationDashboardVariables = (testRun, autoConfigGrafanaDashboard, applicationDashboardVariables) => {
//
//   let dashboardUid = md5(`${testRun.application}${testRun.testEnvironment}${autoConfigGrafanaDashboard.grafana}${autoConfigGrafanaDashboard.dashboardUid}`);
//

//   getApplicationDashboardsByDashboardUidRegex(testRun, autoConfigGrafanaDashboard, applicationDashboardVariables, dashboardUid).then((applicationDashboardsForSystemUnderTest) => {
//
//     let applicationDashboardsForSystemUnderTest.map((applicationDashboard) => {
//
//       return applicationDashboard.dashboardName
//
//     }).filter
//     applicationDashboardVariables.filter((applicationDashboardVariable) => {
//
//         return applicationDashboardsForSystemUnderTest.map((applicationDashboard) => {
//
//           return applicationDashboard.variables[autoConfigGrafanaDashboard.createSeparateDashboardForVariable].values
//         })
//     })
//
//   })
//
// }

module.exports.createVariablesForTitle = (applicationDashboardVariables) => {
  let flattenedApplicationDashboardVariables = '';
  applicationDashboardVariables.sort().forEach((variable) => {
    if (variable.name !== 'system_under_test') {
      flattenedApplicationDashboardVariables += ` | ${variable.name} = `;
      variable.values.sort().forEach((value, valueIndex) => {
        if (valueIndex > 0) {
          flattenedApplicationDashboardVariables += ', ';
        }
        flattenedApplicationDashboardVariables += value;
      });
    }
  });

  return flattenedApplicationDashboardVariables;
};


module.exports.replaceTemplatingVariablesWithValues = (
  testRun,
  createDashboardPostDataPanels,
  applicationDashboardVariables,
  createSeparateDashboardForVariable,
  applicationDashboardVariableValue,
  datasourceType,
) => {
  let panels = [];

  createDashboardPostDataPanels.forEach((panel) => {
    if (panel.type !== 'row') {
      // replace system_under_test and test_environment placeholders in query

      let panelString = JSON.stringify(panel);

      // replace other templating variables in query

      applicationDashboardVariables.forEach((applicationDashboardVariable) => {
        let replaceValue;

        let placeholder = new RegExp(
          '\\$' + escapeRegExp(applicationDashboardVariable.name),
          'g',
        );

        if (
          placeholder.test(panelString) &&
          applicationDashboardVariable.name !== 'system_under_test' &&
          applicationDashboardVariable.name !== 'test_environment'
        ) {
          if (
            applicationDashboardVariable.name ===
            createSeparateDashboardForVariable
          ) {
            replaceValue = applicationDashboardVariableValue;
          } else {
            replaceValue = '';

            applicationDashboardVariable.values.forEach(
              (applicationDashboardVariableValue, valueIndex) => {
                let value =
                  applicationDashboardVariableValue === 'All' ?
                    datasourceType === 'graphite' ?
                      '*'
                    : '.*'
                  : applicationDashboardVariableValue;

                if (valueIndex === 0) {
                  replaceValue += value;
                } else {
                  replaceValue += `|${value}`;
                }
              },
            );
          }
        }

        if (replaceValue)
          panelString = panelString.replace(placeholder, replaceValue);
      });

      const systemUnderTestPlaceholder = new RegExp(
        '\\$system_under_test',
        'g',
      );
      const testEnvironmentPlaceholder = new RegExp('\\$test_environment', 'g');

      panelString = panelString
        .replace(systemUnderTestPlaceholder, testRun.application)
        .replace(testEnvironmentPlaceholder, testRun.testEnvironment);

      panels.push(JSON.parse(panelString));
    } else {
      if (panel.collapsed === true && panel.panels) {
        let nestedPanels = [];

        panel.panels.forEach((nestedPanel) => {
          // replace system_under_test and test_environment placeholders in query

          let nestedPanelString = JSON.stringify(nestedPanel);

          // replace other templating variables in query

          applicationDashboardVariables.forEach(
            (applicationDashboardVariable) => {
              let replaceValue;

              let placeholder = new RegExp(
                '\\$' + escapeRegExp(applicationDashboardVariable.name),
                'g',
              );

              if (
                placeholder.test(nestedPanelString) &&
                applicationDashboardVariable.name !== 'system_under_test' &&
                applicationDashboardVariable.name !== 'test_environment'
              ) {
                if (
                  applicationDashboardVariable.name ===
                  createSeparateDashboardForVariable
                ) {
                  replaceValue = applicationDashboardVariableValue;
                } else {
                  replaceValue = '';

                  applicationDashboardVariable.values.forEach(
                    (applicationDashboardVariableValue, valueIndex) => {
                      let value =
                        applicationDashboardVariableValue === 'All' ?
                          datasourceType === 'graphite' ?
                            '*'
                          : '.*'
                        : applicationDashboardVariableValue;

                      if (valueIndex === 0) {
                        replaceValue += value;
                      } else {
                        replaceValue += `|${value}`;
                      }
                    },
                  );
                }
              }

              if (replaceValue)
                nestedPanelString = nestedPanelString.replace(
                  placeholder,
                  replaceValue,
                );
            },
          );

          const systemUnderTestPlaceholder = new RegExp(
            '\\$system_under_test',
            'g',
          );
          const testEnvironmentPlaceholder = new RegExp(
            '\\$test_environment',
            'g',
          );

          nestedPanelString = nestedPanelString
            .replace(systemUnderTestPlaceholder, testRun.application)
            .replace(testEnvironmentPlaceholder, testRun.testEnvironment);

          nestedPanels.push(JSON.parse(nestedPanelString));
        });

        panel.panels = nestedPanels;
        panels.push(panel);
      } else {
        panels.push(panel);
      }
    }
  });

  return panels;
};

module.exports.escapeRegExp = escapeRegExp;
