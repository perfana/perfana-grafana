#!/usr/bin/env node
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


// This script is meant to be run manually via `npm run fetch-licenses`
// It should not be imported or required by the Meteor application

const fs = require('fs');
const https = require('https');
const path = require('path');
const axios = require('axios');
const logger = require('../helpers/logger');

// Only proceed if this file is being run directly
if (require.main !== module) {
  logger.error('This script should be run via npm run fetch-licenses');
  process.exit(1);
}

const pkg = require('../package.json');

// Combine all dependencies
const allDependencies = {
  ...pkg.dependencies,
  ...pkg.devDependencies
};

async function fetchNpmInfo(packageName) {
  const options = {
    hostname: 'registry.npmjs.org',
    path: `/${packageName}`,
    headers: {
      'User-Agent': 'Node.js'
    }
  };

  return new Promise((resolve, reject) => {
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const info = JSON.parse(data);
          resolve(info);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

function getGithubDetails(repoUrl) {
  if (!repoUrl) return null;
  
  // Clean up the repository URL
  const url = repoUrl.replace('git+', '').replace('.git', '').replace('git:', 'https:');
  
  if (url.includes('github.com')) {
    const parts = url.split('github.com/')[1].split('/');
    return {
      owner: parts[0],
      repo: parts[1]
    };
  }
  return null;
}

async function fetchGithubLicense(owner, repo) {
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/license`,
    headers: {
      'User-Agent': 'Node.js',
      'Accept': 'application/vnd.github.v3+json'
    }
  };

  return new Promise((resolve, reject) => {
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 404) {
            resolve(null);
            return;
          }
          const info = JSON.parse(data);
          if (info.download_url) {
            // Fetch the actual license content
            https.get(info.download_url, (licenseRes) => {
              let licenseData = '';
              licenseRes.on('data', chunk => licenseData += chunk);
              licenseRes.on('end', () => {
                resolve(licenseData);
              });
            }).on('error', reject);
          } else {
            resolve(null);
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function fetchLicense(packageName, version) {
  try {
    const npmInfo = await fetchNpmInfo(packageName);
    const licenseText = npmInfo.license || 'No license information available';
    
    // Create directory for the package
    const dir = path.join(__dirname, '../licenses', packageName.replace('@', '').replace('/', '-'));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write package info
    const licenseInfo = {
      name: packageName,
      version: version,
      license: licenseText,
      repository: npmInfo.repository?.url || 'No repository information available',
      homepage: npmInfo.homepage || 'No homepage information available'
    };

    fs.writeFileSync(
      path.join(dir, 'LICENSE.json'), 
      JSON.stringify(licenseInfo, null, 2)
    );

    // Try to fetch the actual license file from GitHub
    const githubDetails = getGithubDetails(npmInfo.repository?.url);
    if (githubDetails) {
      const licenseContent = await fetchGithubLicense(githubDetails.owner, githubDetails.repo);
      if (licenseContent) {
        fs.writeFileSync(
          path.join(dir, 'LICENSE'), 
          licenseContent
        );
        logger.info(`Saved license file for ${packageName}`);
      } else {
        logger.info(`No license file found on GitHub for ${packageName}`);
      }
    } else {
      logger.info(`No GitHub repository found for ${packageName}`);
    }
  } catch (error) {
    logger.error(`Error fetching license for ${packageName}:`, error.message);
  }
}

async function fetchAllLicenses() {
  for (const [packageName, version] of Object.entries(allDependencies)) {
    await fetchLicense(packageName, version);
  }
}

// Export only if being required as a module and not being run directly
module.exports = { fetchAllLicenses };

