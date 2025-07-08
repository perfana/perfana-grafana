# API Documentation

This document provides detailed information about the Perfana Grafana Sync API and module structure.

## Table of Contents

- [Core Modules](#core-modules)
- [Helper Modules](#helper-modules)
- [Configuration](#configuration)
- [Database Operations](#database-operations)
- [Error Handling](#error-handling)
- [Usage Examples](#usage-examples)

## Core Modules

### Main Entry Point (`index.js`)

The main application entry point that orchestrates the entire synchronization process.

#### Key Functions:
- `startSync()`: Initiates the synchronization loop
- Process startup and database connection management
- Error handling for unhandled rejections

#### Environment Variables Used:
- `SYNC_INTERVAL`: Time between sync cycles (default: 30000ms)

### Grafana Sync (`grafana-sync/grafana-sync.js`)

Main synchronization orchestrator that handles the complete dashboard sync workflow.

#### Key Functions:

```javascript
module.exports = () => Promise
```
Main export function that performs complete synchronization cycle.

```javascript
const syncDashboard = (grafana, perfanaDashboard, update, usedBySUT) => Promise
```
Synchronizes individual dashboard between Grafana and Perfana.

#### Workflow:
1. **Add new dashboards**: `getDashboardsToAdd()` → `syncDashboard()`
2. **Update existing dashboards**: `getDashboardsToUpdate()` → `syncDashboard()`
3. **Restore missing dashboards**: `getDashboardsToRestore()` → `restoreDashboard()`
4. **Update template instances**: `getTemplateDashboardsInstancesToUpdate()` → `updateTemplateDashboardInstances()`

### Dashboard Storage (`grafana-sync/store-dashboard/`)

Handles storing dashboards from Grafana into the Perfana database.

#### Key Modules:
- `store-dashboard.js`: Main storage logic
- `get-dashboards-to-add.js`: Identifies new dashboards to sync

### Dashboard Restoration (`grafana-sync/restore-dashboard/`)

Manages restoration of missing dashboards.

#### Key Modules:
- `restore-dashboard.js`: Main restoration logic
- `get-dashboards-to-restore.js`: Identifies dashboards that need restoration

### Dashboard Updates (`grafana-sync/update-dashboards/`)

Handles updating existing dashboards when changes are detected.

#### Key Modules:
- `get-dashboards-to-update.js`: Identifies dashboards needing updates
- `update-child-collections.js`: Updates related collections
- `update-template-dashboard-instances.js`: Updates template dashboard instances
- `get-template-dashboard-instances-to-update.js`: Identifies template instances to update

## Helper Modules

### Perfana MongoDB Operations (`helpers/perfana-mongo.js`)

Comprehensive MongoDB operations for Perfana data management.

#### Key Functions:

```javascript
getGrafanaInstances() => Promise<Array>
```
Retrieves all configured Grafana instances from the database.

```javascript
updateVersion() => Promise
```
Updates version information in the database.

```javascript
storeDashboard(grafana, dashboard, update, usedBySUT) => Promise
```
Stores or updates dashboard information in MongoDB.

```javascript
getDashboardsToSync(grafana) => Promise<Array>
```
Gets list of dashboards that need synchronization.

### Grafana API Client (`helpers/grafana-api.js`)

HTTP client for interacting with Grafana APIs.

#### Key Functions:

```javascript
grafanaApiGet(grafana, path) => Promise
```
Performs GET requests to Grafana API with authentication.

```javascript
grafanaApiPost(grafana, path, data) => Promise
```
Performs POST requests to Grafana API.

```javascript
grafanaApiPut(grafana, path, data) => Promise
```
Performs PUT requests to Grafana API.

#### Authentication:
Supports API key authentication for Grafana instances.

### Database Connections

#### MongoDB Connection (`helpers/mongoDb.js`)

```javascript
const db = {
  connect() => Promise,
  close() => Promise,
  getDb() => MongoDatabase
}
```

Manages MongoDB connection lifecycle.

#### Grafana Database (`helpers/grafanaDb.js`)

```javascript
const grafanaDb = {
  connect(config) => Promise,
  query(sql, params) => Promise,
  close() => Promise
}
```

Manages direct database connections to Grafana instances (MySQL/PostgreSQL).

### Utilities (`helpers/utils.js`)

Common utility functions used across the application.

#### Key Functions:

```javascript
generateUID() => String
```
Generates unique identifiers for dashboards.

```javascript
sanitizeDashboard(dashboard) => Object
```
Sanitizes dashboard data before storage.

```javascript
compareVersions(v1, v2) => Number
```
Compares version strings for update detection.

## Configuration

### Default Configuration (`config/default.js`)

```javascript
module.exports = {
  database: {
    mongodb: {
      url: process.env.MONGO_URL,
      options: {}
    }
  },
  sync: {
    interval: process.env.SYNC_INTERVAL || 30000,
    maxSeries: process.env.MAX_SERIES || 2
  }
}
```

## Database Operations

### MongoDB Collections

#### Grafana Instances
```javascript
{
  _id: ObjectId,
  name: String,
  url: String,
  apiKey: String,
  enabled: Boolean,
  lastSync: Date
}
```

#### Dashboards
```javascript
{
  _id: ObjectId,
  uid: String,
  title: String,
  grafanaId: String,
  version: Number,
  lastUpdated: Date,
  dashboard: Object, // Full dashboard JSON
  usedBySUT: Array
}
```

#### Template Variables
```javascript
{
  _id: ObjectId,
  dashboardUid: String,
  variables: Array,
  lastUpdated: Date
}
```

### Query Patterns

#### Finding Dashboards to Sync
```javascript
// Get dashboards modified since last sync
db.dashboards.find({
  grafanaId: grafanaInstance._id,
  lastUpdated: { $gt: lastSync }
})
```

#### Template Dashboard Queries
```javascript
// Find template dashboard instances
db.dashboards.find({
  "dashboard.templating.enable": true,
  grafanaId: grafanaInstance._id
})
```

## Error Handling

### Error Types

#### Connection Errors
- MongoDB connection failures
- Grafana API connection errors
- Network timeouts

#### Data Errors
- Dashboard validation failures
- Version conflicts
- Missing required fields

#### Sync Errors
- Concurrent modification conflicts
- API rate limiting
- Permission errors

### Error Recovery

The application implements graceful error recovery:
- Continues sync cycle on individual dashboard failures
- Retries failed operations in next sync cycle
- Logs errors for monitoring and debugging

## Usage Examples

### Basic Sync Operation

```javascript
const grafanaSync = require('./grafana-sync/grafana-sync');

// Perform one sync cycle
grafanaSync()
  .then(() => console.log('Sync completed'))
  .catch(err => console.error('Sync failed:', err));
```

### Custom Dashboard Storage

```javascript
const { storeDashboard } = require('./grafana-sync/store-dashboard/store-dashboard');

storeDashboard(grafanaInstance, dashboardData, false)
  .then(() => console.log('Dashboard stored'))
  .catch(err => console.error('Storage failed:', err));
```

### API Client Usage

```javascript
const { grafanaApiGet } = require('./helpers/grafana-api');

grafanaApiGet(grafanaInstance, '/api/dashboards/uid/dashboard-uid')
  .then(dashboard => console.log('Dashboard retrieved:', dashboard.title))
  .catch(err => console.error('API call failed:', err));
```

### Database Queries

```javascript
const { getGrafanaInstances } = require('./helpers/perfana-mongo');

getGrafanaInstances()
  .then(instances => {
    instances.forEach(instance => {
      console.log(`Grafana instance: ${instance.name} - ${instance.url}`);
    });
  })
  .catch(err => console.error('Database query failed:', err));
```

## Performance Considerations

### Batch Operations
- Dashboards are processed in batches to avoid memory issues
- API calls are throttled to respect Grafana rate limits

### Connection Pooling
- MongoDB connections are pooled for efficiency
- Grafana API clients reuse HTTP connections

### Caching
- Dashboard metadata is cached to reduce API calls
- Version information is cached to optimize update detection

## Security

### API Key Management
- Grafana API keys are stored securely in MongoDB
- API keys are not logged or exposed in error messages

### Data Sanitization
- Dashboard data is sanitized before storage
- User input is validated to prevent injection attacks

### Access Control
- MongoDB access is restricted by connection string
- Grafana API access is limited to read operations where possible 