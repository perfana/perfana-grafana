#!/bin/bash
# Copyright 2025 Perfana Contributors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

if [[ -f /secrets/perfana-mongo-urls-secret.env ]]; then
  echo "Loading MongoDb connection config ..."
  for line in $(cat /secrets/perfana-mongo-urls-secret.env); do [[ "$line" =~ ^MONGO ]] && export $line; done || true
fi

if [[ -f /secrets/perfana-grafana-mysql-secret.env ]]; then
  echo "Loading MySql connection config ..."
  for line in $(cat /secrets/perfana-grafana-mysql-secret.env); do [[ "$line" =~ ^MYSQL ]] && export $line; done || true
fi

if [[ -f /secrets/perfana-grafana-postgres-secret.env ]]; then
  echo "Loading Postgres connection config ..."
  for line in $(cat /secrets/perfana-grafana-postgres-secret.env); do [[ "$line" =~ ^PG ]] && export $line; done || true
fi

