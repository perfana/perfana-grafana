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

const crypto = require('crypto');
const logger = require('../helpers/logger');

class DashboardUid {
  constructor(dashboardUidInput, dashboardUid) {
    this.dashboardUidInput = dashboardUidInput;
    this.dashboardUid = dashboardUid;
  }

  /**
   * Create dashboard UID from string
   */
  static fromString(dashboardUid) {
    return new DashboardUid(dashboardUid, dashboardUid);
  }

  /**
   * Create dashboard UID from hashed string
   */
  static fromHashedString(dashboardUid) {
    const hashed = crypto.createHash('md5').update(dashboardUid).digest('hex');
    return new DashboardUid(dashboardUid, hashed);
  }

  /**
   * Generate dashboard UID for regular or readOnly dashboards
   * Equivalent to: DashboardUid.kt:19-33
   */
  static from(testRun, autoConfigDashboard) {
    const dashboardUid = autoConfigDashboard.dashboardUid;

    if (autoConfigDashboard.readOnly) {
      logger.debug(`ReadOnly auto config dashboardUid: ${dashboardUid} for ${autoConfigDashboard.dashboardName}`);
      return DashboardUid.fromString(dashboardUid);
    } else {
      const toBeHashed = `${testRun.application}${testRun.testEnvironment}${autoConfigDashboard.grafana}${dashboardUid}`;
      const hashed = DashboardUid.fromHashedString(toBeHashed);
      logger.debug(`To be hashed: ${toBeHashed} > ${hashed.dashboardUid}`);
      return hashed;
    }
  }

  /**
   * Generate legacy dashboard UID for backwards compatibility
   * Equivalent to: DashboardUid.kt:41-63
   */
  static legacyFrom(testRun, autoConfigDashboard, variables) {
    const hardCodedVarNames = autoConfigDashboard.setHardcodedValueForVariables?.map(v => v.name) || [];

    const filteredHardCodedVars = variables.filter(v => !hardCodedVarNames.includes(v.name));

    const filteredCreateSeparateDashboardVars = filteredHardCodedVars.filter(v => 
      v.name === autoConfigDashboard.createSeparateDashboardForVariable ||
      v.name === "system_under_test" ||
      v.name === "test_environment"
    );

    const flattenedVariables = DashboardUid.flattenVariables(filteredCreateSeparateDashboardVars);

    const toBeHashed = `${testRun.application}${testRun.testEnvironment}${autoConfigDashboard.grafana}${autoConfigDashboard.dashboardUid}${flattenedVariables}`;

    const hashedDashboardUid = DashboardUid.fromHashedString(toBeHashed);

    logger.info(`To be hashed (legacy): ${toBeHashed} > ${hashedDashboardUid.dashboardUid}`);

    return hashedDashboardUid;
  }

  /**
   * Flatten variables into a string for hashing
   * Equivalent to: DashboardUid.kt:65-77
   */
  static flattenVariables(variables) {
    if (!variables || variables.length === 0) {
      return "";
    }

    const dashboardVariables = [];
    variables.forEach(variable => {
      dashboardVariables.push(variable.name);
      variable.values.forEach(value => {
        dashboardVariables.push(value);
      });
    });

    return dashboardVariables.join("");
  }

  toString() {
    return `dashboardUid: '${this.dashboardUid}'`;
  }

  toFullString() {
    return `Hashed dashboard uid: '${this.dashboardUidInput}' -> '${this.dashboardUid}'`;
  }
}

module.exports = DashboardUid;