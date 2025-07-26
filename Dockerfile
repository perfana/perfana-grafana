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

FROM node:22.15 AS build-env

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy all application files
COPY . .

FROM node:22.17.1-alpine

# Install required packages
RUN apk update && apk upgrade --available && apk add --no-cache bash && sync && apk --purge del apk-tools

WORKDIR /app

# Copy everything from build stage
COPY --from=build-env /app .

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R 1000:1000 logs

# Make scripts executable
RUN chmod +x entrypoint.sh startup.sh

USER 1000:1000

ENTRYPOINT ["./entrypoint.sh"]

CMD ["node", "index.js"]
