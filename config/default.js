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

module.exports = {
  sync: {
    interval: 30 * 1000, // 30 seconds
  },
  testRunSanityChecker: {
    enabled:
      process.env.hasOwnProperty('TEST_RUN_SANITY_CHECKER_ENABLED') ?
        process.env.TEST_RUN_SANITY_CHECKER_ENABLED === 'true'
      : true,
    delayInMinutes:
      process.env.hasOwnProperty('TEST_RUN_SANITY_CHECKER_DELAY_MINUTES') ?
        parseInt(process.env.TEST_RUN_SANITY_CHECKER_DELAY_MINUTES)
      : 5,
    interval:
      process.env.hasOwnProperty('TEST_RUN_SANITY_CHECKER_INTERVAL') ?
        parseInt(process.env.TEST_RUN_SANITY_CHECKER_INTERVAL)
      : 5 * 60 * 1000, // 5 minutes
  },
  sanityChecker: {
    enabled:
      process.env.hasOwnProperty('SANITY_CHECKER_ENABLED') ?
        process.env.SANITY_CHECKER_ENABLED === 'true'
      : true,
    interval:
      process.env.hasOwnProperty('SANITY_CHECKER_INTERVAL') ?
        parseInt(process.env.SANITY_CHECKER_INTERVAL)
      : 10 * 60 * 1000, // 10 minutes
  },
  propagateTemplateUpdates:
    process.env.hasOwnProperty('PROPAGATE_TEMPLATE_UPDATES') ?
      process.env.PROPAGATE_TEMPLATE_UPDATES
    : false,
  prometheusVariablesQueryTimeRangeDays:
    process.env.hasOwnProperty('PROMETHEUS_VARIABLES_QUERY_TIME_RANGE_DAYS') ?
      process.env.PROMETHEUS_VARIABLES_QUERY_TIME_RANGE_DAYS
    : 1,
};
