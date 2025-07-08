# File Index

This document provides a comprehensive index of all files in the Perfana Grafana Sync repository, organized by purpose and functionality.

## Table of Contents

- [Application Entry Points](#application-entry-points)
- [Core Synchronization Logic](#core-synchronization-logic)
- [Helper Modules](#helper-modules)
- [Configuration Files](#configuration-files)
- [Build and Deployment](#build-and-deployment)
- [Documentation](#documentation)
- [Development Tools](#development-tools)
- [Dependencies and Licenses](#dependencies-and-licenses)

## Application Entry Points

### `index.js`
**Purpose**: Main application entry point  
**Description**: Orchestrates database connection, version updates, and starts the synchronization loop  
**Key Functions**: `startSync()`, database connection management, error handling  
**Dependencies**: `./grafana-sync/grafana-sync`, `./helpers/perfana-mongo`, `./helpers/mongoDb`

### `startup.sh`
**Purpose**: Application startup script  
**Description**: Shell script for initializing the application environment  
**Usage**: Called during container startup or manual deployment  

### `entrypoint.sh`
**Purpose**: Docker container entrypoint  
**Description**: Container initialization script  
**Usage**: Executed when Docker container starts  

## Core Synchronization Logic

### `grafana-sync/grafana-sync.js`
**Purpose**: Main synchronization orchestrator  
**Description**: Coordinates the complete dashboard sync workflow  
**Key Operations**:
- Adding new dashboards
- Updating existing dashboards  
- Restoring missing dashboards
- Managing template dashboard instances

### Dashboard Storage

#### `grafana-sync/store-dashboard/store-dashboard.js`
**Purpose**: Dashboard storage logic  
**Description**: Handles storing dashboards from Grafana into Perfana database  

#### `grafana-sync/store-dashboard/get-dashboards-to-add.js`
**Purpose**: New dashboard identification  
**Description**: Identifies dashboards that need to be added to Perfana  

### Dashboard Restoration

#### `grafana-sync/restore-dashboard/restore-dashboard.js`
**Purpose**: Dashboard restoration logic  
**Description**: Restores dashboards that are missing from Grafana  

#### `grafana-sync/restore-dashboard/get-dashboards-to-restore.js`
**Purpose**: Missing dashboard identification  
**Description**: Identifies dashboards that need to be restored  

### Dashboard Updates

#### `grafana-sync/update-dashboards/get-dashboards-to-update.js`
**Purpose**: Update identification  
**Description**: Identifies dashboards that need updates  

#### `grafana-sync/update-dashboards/update-child-collections.js`
**Purpose**: Related data updates  
**Description**: Updates collections related to dashboard changes  

#### `grafana-sync/update-dashboards/update-template-dashboard-instances.js`
**Purpose**: Template instance updates  
**Description**: Updates template dashboard instances  

#### `grafana-sync/update-dashboards/get-template-dashboard-instances-to-update.js`
**Purpose**: Template update identification  
**Description**: Identifies template dashboard instances needing updates  

### Template Management

#### `grafana-sync/store-templating-variables.js`
**Purpose**: Template variable storage  
**Description**: Manages storage and retrieval of dashboard templating variables  

## Helper Modules

### Database Operations

#### `helpers/perfana-mongo.js`
**Purpose**: Perfana MongoDB operations  
**Description**: Comprehensive MongoDB operations for Perfana data management  
**Key Functions**:
- `getGrafanaInstances()`
- `updateVersion()`
- `storeDashboard()`
- Dashboard querying and management

#### `helpers/mongoDb.js`
**Purpose**: MongoDB connection management  
**Description**: Handles MongoDB connection lifecycle  
**Exports**: Connection object with `connect()`, `close()`, `getDb()` methods

#### `helpers/grafanaDb.js`
**Purpose**: Grafana database connection  
**Description**: Direct database connections to Grafana instances (MySQL/PostgreSQL)  

### API Clients

#### `helpers/grafana-api.js`
**Purpose**: Grafana API client  
**Description**: HTTP client for Grafana API interactions  
**Key Functions**:
- `grafanaApiGet()`, `grafanaApiPost()`, `grafanaApiPut()`
- Authentication handling
- Error management

### Utilities

#### `helpers/utils.js`
**Purpose**: General utilities  
**Description**: Common utility functions used across the application  
**Functions**: UID generation, dashboard sanitization, version comparison  

### Data Sources

#### `helpers/datasources/`
**Purpose**: Data source configurations  
**Description**: Contains configuration files for various data source types  
**Structure**: Multiple configuration files for different database and monitoring systems

## Configuration Files

### `config/default.js`
**Purpose**: Default application configuration  
**Description**: Contains default settings for database connections, sync intervals, and other parameters  

### `package.json`
**Purpose**: Node.js project configuration  
**Description**: Defines dependencies, scripts, and project metadata  
**Scripts**:
- `start`: Application startup with environment configuration
- `fetch-licenses`: License information gathering

### `package-lock.json`
**Purpose**: Dependency lock file  
**Description**: Ensures consistent dependency versions across installations  

## Build and Deployment

### Docker

#### `Dockerfile`
**Purpose**: Docker container definition  
**Description**: Defines the container image for the application  

#### `.dockerignore`
**Purpose**: Docker build exclusions  
**Description**: Specifies files and directories to exclude from Docker build context  

### Scripts

#### `scripts/fetch-licenses.js`
**Purpose**: License information gathering  
**Description**: Collects license information from all dependencies  

#### `scripts/fetch-licenses-runner.js`
**Purpose**: License script runner  
**Description**: Entry point for running license collection  

### Command Files

#### `command`
**Purpose**: Command definition  
**Description**: Contains command-line interface definitions or shortcuts  

#### `obfuscate`
**Purpose**: Code obfuscation script  
**Description**: Script for obfuscating sensitive code or data  

## Documentation

### `README.md`
**Purpose**: Main project documentation  
**Description**: Comprehensive overview, installation guide, and usage instructions  

### `docs/API.md`
**Purpose**: API documentation  
**Description**: Detailed API reference and usage examples  

### `docs/FILE_INDEX.md`
**Purpose**: File catalog (this document)  
**Description**: Comprehensive index of all project files  

### `LICENSE`
**Purpose**: Project license  
**Description**: ISC license terms and conditions  

### `version.txt`
**Purpose**: Version tracking  
**Description**: Contains current application version  

## Development Tools

### Code Quality

#### `.eslintrc.js`
**Purpose**: ESLint configuration  
**Description**: JavaScript linting rules and settings  

#### `.eslintignore`
**Purpose**: ESLint exclusions  
**Description**: Files and directories to exclude from linting  

#### `.prettierrc.json`
**Purpose**: Prettier configuration  
**Description**: Code formatting rules and settings  

#### `.editorconfig`
**Purpose**: Editor configuration  
**Description**: Consistent editor settings across different IDEs  

### Version Control

#### `.gitignore`
**Purpose**: Git exclusions  
**Description**: Files and directories to exclude from version control  

#### `.git/`
**Purpose**: Git repository data  
**Description**: Git version control metadata and history  

### IDE Configuration

#### `.idea/`
**Purpose**: IntelliJ IDEA configuration  
**Description**: IDE-specific settings and project configuration  

## Dependencies and Licenses

### `node_modules/`
**Purpose**: Node.js dependencies  
**Description**: Installed npm packages and their dependencies  

### `licenses/`
**Purpose**: License information  
**Description**: Contains license files for all dependencies  
**Structure**: Organized by package name with JSON license files  

## File Relationships

### Critical Path Dependencies
```
index.js
├── grafana-sync/grafana-sync.js
│   ├── store-dashboard/
│   ├── restore-dashboard/
│   └── update-dashboards/
├── helpers/perfana-mongo.js
└── helpers/mongoDb.js
```

### Configuration Dependencies
```
index.js
├── config/default.js
├── package.json (environment variables)
└── .env files (if present)
```

### Build Dependencies
```
Dockerfile
├── package.json
├── startup.sh
├── entrypoint.sh
└── .dockerignore
```

## File Categories by Function

### **Core Application** (Runtime Critical)
- `index.js`
- `grafana-sync/grafana-sync.js`
- `helpers/perfana-mongo.js`
- `helpers/mongoDb.js`
- `helpers/grafana-api.js`

### **Configuration** (Environment Setup)
- `config/default.js`
- `package.json`
- Environment variable files

### **Deployment** (Infrastructure)
- `Dockerfile`
- `startup.sh`
- `entrypoint.sh`
- `.dockerignore`

### **Development** (Code Quality)
- `.eslintrc.js`
- `.prettierrc.json`
- `.editorconfig`
- `.gitignore`

### **Documentation** (Knowledge Base)
- `README.md`
- `docs/API.md`
- `docs/FILE_INDEX.md`
- `LICENSE`

This index serves as a navigation guide for developers working with the Perfana Grafana Sync codebase, providing quick access to file purposes and relationships. 