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

const fetch = require('node-fetch');

module.exports.grafanaApiGet = async (grafana, endpoint) => {
  const token =
    grafana.apiKey && grafana.apiKey !== '' ?
      'Bearer ' + grafana.apiKey
    : undefined;

  // noinspection JSUnresolvedReference
  const apiUrl =
    grafana.serverUrl ?
      grafana.serverUrl + endpoint
    : grafana.clientUrl + endpoint;

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: token,
  };

  const options = {
    method: 'GET',
    headers,
  };

  const response = await fetch(apiUrl, options);
  if (!response.ok) {
    throw new Error(
      `statusCode: ${response.status} statusText: ${response.statusText}`,
    );
  }
  return response.json();
};

module.exports.grafanaApiDelete = async (grafana, endpoint) => {
  const token =
    grafana.apiKey && grafana.apiKey !== '' ?
      'Bearer ' + grafana.apiKey
    : undefined;

  // noinspection JSUnresolvedReference
  const apiUrl =
    grafana.serverUrl ?
      grafana.serverUrl + endpoint
    : grafana.clientUrl + endpoint;

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: token,
  };

  const options = {
    method: 'DELETE',
    headers,
  };

  const response = await fetch(apiUrl, options);
  if (!response.ok) {
    throw new Error(
      `statusCode: ${response.status} statusText: ${response.statusText}`,
    );
  }
  return response.json();
};

module.exports.grafanaApiPost = async (grafana, endpoint, postData) => {
  const token =
    grafana.apiKey && grafana.apiKey !== '' ?
      'Bearer ' + grafana.apiKey
    : undefined;

  // noinspection JSUnresolvedReference
  const apiUrl =
    grafana.serverUrl ?
      grafana.serverUrl + endpoint
    : grafana.clientUrl + endpoint;

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: token,
  };

  const options = {
    method: 'POST',
    headers,
    body: JSON.stringify(postData),
  };

  try {
    const response = await fetch(apiUrl, options);
    if (!response.ok) {
      throw new Error(
        `statusCode: ${response.status} statusText: ${response.statusText}`,
      );
    }
    return response.json();
  } catch (err) {
    const message = `POST call to Grafana instance ${grafana.label}, endpoint ${apiUrl} failed, ${err}`;
    throw new Error(message);
  }
};
