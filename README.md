# Perfana Grafana Sync

A Node.js application that synchronizes Grafana dashboards with the Perfana platform, providing automated dashboard management and configuration.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Docker](#docker)
- [License](#license)

## Overview

Perfana Grafana Sync is a synchronization service that manages Grafana dashboards by:
- Adding new dashboards from Grafana to Perfana
- Updating existing dashboards when changes are detected
- Restoring missing dashboards
- Managing template dashboard instances
- Auto-configuring dashboards based on test run profiles
- Cleaning up test runs
- Validating benchmarks

## Prerequisites

- Node.js (v18+ recommended)
- MongoDB (for data storage)
- Grafana instance(s) to sync from
- Network access to both MongoDB and Grafana instances

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd perfana-grafana
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see [Configuration](#configuration))

4. Start the application:
```bash
npm start
```

## Configuration

### Environment Variables

#### Core Configuration
- `MONGO_URL`: MongoDB connection string  
  - Default: `mongodb://${DOCKER_HOST_IP}:27012,${DOCKER_HOST_IP}:27013/perfana?replicaSet=rs0`
  - Example: `mongodb://username:password@mongo-host:27017/perfana?authSource=admin`
- `SYNC_INTERVAL`: Synchronization interval in milliseconds (default: 30000)
  - Recommended: 30000-60000 for production environments
- `MAX_SERIES`: Maximum series limit (default: 2)
- `DOCKER_HOST_IP`: Docker host IP address (required for Docker deployments)
- `LOG_LEVEL`: Logging level - `error`, `warn`, `info`, `debug` (default: `info`)
- `PROPAGATE_TEMPLATE_UPDATES`: Enable template update propagation (default: `false`)
- `PROMETHEUS_VARIABLES_QUERY_TIME_RANGE_DAYS`: Prometheus query range in days (default: 1)

#### Sanity Checker Configuration
- `TESTRUN_SANITY_CHECKER_ENABLED`: Enable test run sanity checker (default: `true`)
- `TESTRUN_SANITY_CHECKER_DELAY_IN_MINUTES`: Delay before marking test runs as invalid (default: 10)
- `TESTRUN_SANITY_CHECKER_INTERVAL`: Check interval in milliseconds (default: 300000)
- `SANITY_CHECKER_ENABLED`: Enable general sanity checker (default: `true`)
- `SANITY_CHECKER_INTERVAL`: Check interval in milliseconds (default: 3600000)

### Configuration Examples

#### Development Environment
```bash
# .env file for development
MONGO_URL=mongodb://localhost:27017/perfana
SYNC_INTERVAL=10000
LOG_LEVEL=debug
TESTRUN_SANITY_CHECKER_ENABLED=true
SANITY_CHECKER_ENABLED=true
```

#### Production Environment
```bash
# Production environment variables
MONGO_URL=mongodb://username:password@mongo-cluster:27017/perfana?replicaSet=rs0&authSource=admin
SYNC_INTERVAL=30000
LOG_LEVEL=info
TESTRUN_SANITY_CHECKER_ENABLED=true
TESTRUN_SANITY_CHECKER_DELAY_IN_MINUTES=15
SANITY_CHECKER_ENABLED=true
SANITY_CHECKER_INTERVAL=3600000
PROPAGATE_TEMPLATE_UPDATES=true
```

#### Docker Environment
```bash
# Docker environment variables
DOCKER_HOST_IP=192.168.1.100
MONGO_URL=mongodb://${DOCKER_HOST_IP}:27017/perfana
SYNC_INTERVAL=30000
LOG_LEVEL=info
```

### Database Configuration

The application connects to MongoDB for storing dashboard metadata and synchronization state. Ensure your MongoDB instance is configured with:

- **Authentication**: Use username/password authentication
- **Replica Set**: Configure replica set for high availability
- **Indexes**: Appropriate indexes will be created automatically
- **Connection Pooling**: MongoDB driver handles connection pooling automatically

## Usage

### Starting the Service

```bash
npm start
```

The service will:
1. Connect to the MongoDB database
2. Update version information
3. Start the synchronization loop
4. Start the test run sanity checker (if enabled)
5. Start the benchmark sanity checker (if enabled)
6. Continuously sync Grafana dashboards based on the configured interval
7. Run autoconfiguration logic

### Development Mode

For development with auto-reload:
```bash
nodemon index.js
```

### Docker Deployment

Build and run with Docker:
```bash
docker build -t perfana-grafana .
docker run -d perfana-grafana
```

## Project Structure

```
perfana-grafana/
├── index.js                    # Main application entry point
├── package.json                # Node.js dependencies and scripts
├── Dockerfile                  # Docker container configuration
├── startup.sh                  # Startup script
├── entrypoint.sh              # Docker entrypoint
│
├── grafana-sync/              # Core synchronization logic
│   ├── grafana-sync.js        # Main sync orchestrator
│   ├── store-dashboard/       # Dashboard storage functionality
│   ├── restore-dashboard/     # Dashboard restoration logic
│   ├── update-dashboards/     # Dashboard update operations
│   └── store-templating-variables.js
│
├── auto-config/               # Auto-configuration system
│   ├── auto-config-service.js # Main auto-config orchestrator
│   ├── auto-config-finders.js # Data retrieval operations
│   ├── auto-config-updates.js # Data update operations
│   └── dashboard-uid.js       # Dashboard UID generation
│
├── test-run-sanity-checker/   # Test run validation system
│   └── test-run-sanity-checker.js # Stuck test run detection and cleanup
│
├── sanity-checker/            # General sanity checking system
│   └── sanity-checker.js      # SLI/SLO validation and test run expiry
│
├── helpers/                   # Utility functions and database connections
│   ├── perfana-mongo.js       # Perfana MongoDB operations
│   ├── grafana-api.js         # Grafana API client
│   ├── grafanaDb.js          # Grafana database operations
│   ├── mongoDb.js            # MongoDB connection helper
│   ├── utils.js              # General utilities
│   ├── logger.js             # Winston logging configuration
│   └── datasources/          # Data source configurations
│
├── config/                    # Application configuration
│   └── default.js            # Default configuration settings
│
├── scripts/                  # Build and utility scripts
│   ├── fetch-licenses.js     # License fetching utility
│   └── fetch-licenses-runner.js
│
└── licenses/                 # License information for dependencies
```

## API Documentation

### Core Modules

#### Grafana Sync (`grafana-sync/grafana-sync.js`)
Main synchronization orchestrator that coordinates:
- Adding new dashboards
- Updating existing dashboards  
- Restoring missing dashboards
- Managing template dashboard instances

#### Auto-Configuration (`auto-config/auto-config-service.js`)
Automated dashboard creation system that:
- Creates dashboards based on test run profiles
- Creates service level indicators, based on profiles
- Creates report panels, based on profiles
- Creates deeplinks, based on profiles

#### Test Run Sanity Checker (`test-run-sanity-checker/test-run-sanity-checker.js`)
Validates test run health by:
- Detecting stuck or blocked test runs
- Marking invalid test runs with appropriate status

#### Sanity Checker (`sanity-checker/sanity-checker.js`)
General system health validation:
- SLI/SLO benchmark validation against Grafana dashboards
- Test run expiry and cleanup
- Snapshot management and cleanup
- Data integrity checks

#### Grafana API Helper (`helpers/grafana-api.js`)
Provides interface for Grafana HTTP API operations:
- Dashboard retrieval
- API authentication
- Error handling

#### Perfana MongoDB Operations (`helpers/perfana-mongo.js`)
Handles all MongoDB operations for Perfana:
- Dashboard storage and retrieval
- Version management
- Instance configuration
- Test run and benchmark data access

### Key Functions

#### Core Sync Functions
- `getGrafanaInstances()`: Retrieves configured Grafana instances
- `syncDashboard()`: Synchronizes individual dashboard
- `storeDashboard()`: Stores dashboard in database
- `restoreDashboard()`: Restores missing dashboard
- `updateTemplateDashboardInstances()`: Updates template instances

#### Auto-Configuration Functions
- `processAutoConfigDashboards()`: Main auto-config orchestration
- `processAutoConfigDashboardsForTestRun()`: Process dashboards for specific test run
- `findApplicationDashboards()`: Locate existing application dashboards
- `createDashboardsInGrafanaAndMongo()`: Create new dashboards
- `storeApplicationDashboardsInMongo()`: Store dashboard metadata

#### Sanity Checker Functions
- `removeBlockedTestRuns()`: Clean up stuck test runs
- `checkSliSloSanity()`: Validate SLI/SLO benchmarks
- `expireTestRuns()`: Clean up expired test runs
- `removeOldSnapshots()`: Clean up old snapshot data

## Development

### Code Style

The project uses:
- ESLint for code linting (`.eslintrc.js`)
- Prettier for code formatting (`.prettierrc.json`)

### Running Lints

```bash
# Run ESLint
npx eslint .

# Run Prettier
npx prettier --check .
```

### Debugging

To enable debug logging, set the `LOG_LEVEL` environment variable:
```bash
LOG_LEVEL=debug npm start
```

This will show detailed debug information including:
- Auto-configuration process details
- Dashboard creation and update logic
- Sanity checker operations
- Database queries and operations


## Docker

### Building the Image

```bash
docker build -t perfana-grafana .
```

### Running the Container

```bash
docker run -d \
  -e MONGO_URL=mongodb://your-mongo-host:27017/perfana \
  -e SYNC_INTERVAL=30000 \
  -e LOG_LEVEL=info \
  -e TESTRUN_SANITY_CHECKER_ENABLED=true \
  -e SANITY_CHECKER_ENABLED=true \
  perfana-grafana
```



## License

ISC License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting:
   ```bash
   npx eslint .
   npx prettier --check .
   ```
5. Submit a pull request

## Support

For issues and questions, please use the GitHub issue tracker. 