# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Perfana Grafana Sync is a Node.js synchronization service that acts as a bridge between Grafana instances and the Perfana performance monitoring platform. It runs as a containerized daemon that continuously syncs dashboard configurations.

## Development Commands

### Running the Application
```bash
npm start                    # Start with nodemon and development environment
node index.js               # Start directly without auto-reload
```

### Code Quality
```bash
npx eslint .                 # Run ESLint linting
npx prettier --check .       # Check Prettier formatting
npx prettier --write .       # Fix Prettier formatting
npm run fetch-licenses       # Update dependency license information
```

### Docker Operations
```bash
docker build -t perfana-grafana .                    # Build container image
docker run -d perfana-grafana                        # Run container
```

## Architecture Overview

### Core Synchronization Flow
The application follows a continuous sync loop pattern:
1. **Initialization** (`index.js`): Connect to MongoDB, update version, start sync loop
2. **Sync Orchestration** (`grafana-sync/grafana-sync.js`): Main controller that processes each Grafana instance
3. **Dashboard Operations**: Four parallel sync operations per instance:
   - Store new dashboards (`store-dashboard/`)
   - Update existing dashboards (`update-dashboards/`)
   - Restore missing dashboards (`restore-dashboard/`)
   - Update template dashboard instances (`store-templating-variables.js`)
4. **Auto-Configuration** (`auto-config/`): Automated dashboard creation and configuration based on test runs and profiles

### Database Layer Architecture
- **Primary Store**: MongoDB via `helpers/perfana-mongo.js` for dashboard metadata and sync state
- **Secondary Access**: MySQL/PostgreSQL via `helpers/grafanaDb.js` for direct Grafana database queries
- **Connection Management**: Centralized in `helpers/mongoDb.js`

### API Integration Layer
- **Grafana HTTP API**: `helpers/grafana-api.js` handles REST API calls to Grafana instances
- **Data Source Adapters**: `helpers/datasources/` contains specialized handlers for:
  - Prometheus (`prometheus.js`)
  - InfluxDB (`influxdb.js`) 
  - Elasticsearch (`elastic.js`)
  - Graphite (`graphite.js`)

## Configuration Management

### Environment Variables
- `MONGO_URL`: MongoDB connection string (required)
- `SYNC_INTERVAL`: Sync frequency in milliseconds (default: 30000)
- `MAX_SERIES`: Maximum series limit (default: 2)
- `PROPAGATE_TEMPLATE_UPDATES`: Enable template update propagation
- `PROMETHEUS_VARIABLES_QUERY_TIME_RANGE_DAYS`: Prometheus query range (default: 1)

### Secret Management
Secrets are loaded from mounted volumes at `/secrets/` via `startup.sh` during container initialization.

## Code Style and Standards

### ESLint Configuration
- ES2018 syntax support
- Node.js environment
- Single quotes, 2-space indentation, no semicolons
- Unix line endings
- Jest testing support configured

### Prettier Configuration
- Single quotes, 2-space tabs
- Experimental ternaries enabled

## Key Patterns and Conventions

### Async/Await Pattern
The codebase consistently uses modern async/await instead of callbacks or raw promises. All database operations and HTTP calls follow this pattern.

### Error Handling Strategy
- Comprehensive logging via Winston (`helpers/logger.js`)
- Graceful degradation for individual Grafana instance failures
- Continuation of sync loop even when individual operations fail

### Data Flow Pattern
1. **Retrieve** Grafana instances from MongoDB
2. **Process** each instance in parallel using `async.each`
3. **Execute** four sync operations concurrently per instance
4. **Log** results and continue to next sync cycle

### Database Abstraction
- `helpers/perfana-mongo.js`: All Perfana-specific MongoDB operations
- `helpers/grafanaDb.js`: Direct Grafana database access when API insufficient
- `helpers/mongoDb.js`: Low-level MongoDB connection management

## Testing Structure

Test fixtures and examples are located in `test/grafana-11.4.0/` with sample dashboard configurations and data source definitions for development and testing scenarios.

## Important Implementation Notes

### Multi-Database Support
The application connects to both MongoDB (primary) and SQL databases (Grafana backends), requiring careful connection management and error handling across different database types.

### Template Dashboard System
Template dashboards have a complex update propagation system controlled by `PROPAGATE_TEMPLATE_UPDATES` that requires understanding of the dashboard hierarchy in Perfana.

### Auto-Configuration System
The auto-config system (`auto-config/`) runs after each sync cycle and provides:
- **Profile-based dashboard creation**: Automatically creates dashboards based on test run profiles and tags
- **Generic checks/deep links/report panels**: Syncs generic configuration objects with test runs
- **Dynamic variable replacement**: Replaces template variables with actual test run values
- **Dashboard lifecycle management**: Creates, updates, and manages application-specific dashboards

### Data Source Integration
Each supported monitoring system (Prometheus, InfluxDB, etc.) has specific query patterns and variable handling that are abstracted in the `datasources/` modules.