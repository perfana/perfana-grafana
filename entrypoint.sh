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

set -o errexit

# Source an init script that a child image may have added
if [ -x /app/startup.sh ]; then
	source /app/startup.sh
fi

echo 'Starting app...'

# Debug sleep - set DEBUG_SLEEP environment variable to add delay
if [ -n "$DEBUG_SLEEP" ]; then
    echo "DEBUG: Sleeping for $DEBUG_SLEEP seconds for debugging purposes..."
    sleep "$DEBUG_SLEEP"
fi

exec "$@"
