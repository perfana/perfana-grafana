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

const {replaceDynamicVariableValues} = require('./replaceDynamicVariableValues')

module.exports.matchValue = (matchRegexForVariables, applicationDashboardVariableName, applicationDashboardVariableValue, testRun) => {

  let valueMatched = false;

  matchRegexForVariables.forEach((matchVariable) => {


    let valueRegex = new RegExp(replaceDynamicVariableValues(matchVariable.regex, testRun));

    if (applicationDashboardVariableName === matchVariable.name) {

      if (valueRegex.test(applicationDashboardVariableValue)) valueMatched = true;

    }
  })

  return valueMatched;

}