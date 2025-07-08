# Perfana AutoConfig Analysis Document

## Overview
The Perfana AutoConfig system processes recent test runs to automatically create and manage Grafana dashboards, generic checks, deep links, and report panels. The system runs every 5 minutes and processes test runs that have ended within that timeframe.

## Core Process Flow

### 1. Main Entry Point: `processAutoConfigDashboards()`
**Location**: `AutoConfigService.kt:81`

**Steps**:
1. Find recent test runs (last 5 minutes) using `findRecentTestRuns()`
2. Filter test runs to only include those with tags
3. Find all profiles, autoConfigDashboards, genericChecks, genericDeepLinks, genericReportPanels
4. For each test run, process all auto-config components

### 2. Recent Test Runs Query
**Location**: `AutoConfigFinders.kt:14-21`

**MongoDB Query**:
```javascript
db.testRuns.find({
  "end": { $gte: <5 minutes ago> }
})
```

**Key Fields Used**:
- `end` (Instant) - When the test ended
- `tags` (List<String>) - Must not be empty
- `application` (String)
- `testEnvironment` (String) 
- `testType` (String)
- `variables` (List<TestRunVariable>)

## Dashboard Auto-Configuration

### 3. Dashboard Processing: `processAutoConfigDashboard()`
**Location**: `AutoConfigService.kt:272-379`

**Query for AutoConfigGrafanaDashboards**:
```javascript
db.autoConfigGrafanaDashboards.find({})
```

**Filtering Logic**:
1. Filter by profile names that match test run tags
2. Find template dashboard by `autoConfigDashboard.dashboardUid`
3. Generate application dashboard variables
4. Check if variable values are found

### 4. ReadOnly Dashboard Logic
**Location**: `AutoConfigService.kt:364, 454-461`

**Key Condition**: `autoConfigDashboard.readOnly = true`

**When ReadOnly**:
- **Skip Grafana dashboard creation** entirely
- **Reuse existing template dashboard** from `autoConfigDashboard.dashboardUid`
- **Update template's usedBySut** to include current application
- **Create ApplicationDashboard** record pointing to template UID

**Dashboard UID Logic** (`DashboardUid.kt:19-33`):
- **ReadOnly**: Use template UID directly (`autoConfigDashboard.dashboardUid`)
- **Regular**: Hash `${application}${testEnvironment}${grafana}${dashboardUid}`

### 5. Application Dashboard Query
**Location**: `AutoConfigFinders.kt:55-68`

**MongoDB Query**:
```javascript
db.applicationDashboards.find({
  "grafana": <grafanaLabel>,
  "dashboardUid": <dashboardUid>, 
  "application": <testRun.application>,
  "testEnvironment": <testRun.testEnvironment>
})
```

### 6. Application Dashboard Creation
**Location**: `AutoConfigService.kt:692-737, 739-781`

**Fields Set**:
```javascript
{
  "_id": <generated>,
  "application": <testRun.application>,
  "testEnvironment": <testRun.testEnvironment>, 
  "grafana": <grafanaDashboard.grafana>,
  "dashboardName": <grafanaDashboard.name>,
  "dashboardId": <grafanaDashboard.id>,
  "dashboardUid": <grafanaDashboard.uid>, // For readOnly: template UID
  "dashboardLabel": <autoConfigDashboard.dashboardName>,
  "snapshotTimeout": 4,
  "templateDashboardUid": <templateDashboardUid>, // For readOnly: template UID
  "tags": <grafanaDashboard.tags>,
  "variables": <processedVariables>
}
```

## Generic Checks Processing

### 7. Generic Checks: `processAutoConfigGenericChecks()`
**Location**: `AutoConfigService.kt:200-239`

**Query for GenericChecks**:
```javascript
db.genericChecks.find({})
```

**Processing**:
1. Filter by profile names matching test run tags
2. Check workload regex against `testRun.testType`
3. Find application dashboards by `genericCheck.dashboardUid`
4. Check for existing benchmarks
5. Create benchmark if none exists

**Benchmark Existence Query** (`AutoConfigFinders.kt:112-132`):
```javascript
db.benchmarks.find({
  "genericCheckId": <checkId>,
  "application": <applicationDashboard.application>,
  "testEnvironment": <applicationDashboard.testEnvironment>, 
  "testType": <testType>,
  "dashboardLabel": <applicationDashboard.dashboardLabel>
})
```

## Generic Deep Links Processing

### 8. Generic Deep Links: `processAutoConfigGenericDeepLinks()`
**Location**: `AutoConfigService.kt:175-198`

**Query for GenericDeepLinks**:
```javascript
db.genericDeepLinks.find({})
```

**Deep Link Existence Query** (`AutoConfigFinders.kt:134-149`):
```javascript
db.deepLinks.find({
  "genericDeepLinkId": <genericDeepLink.id>,
  "application": <testRun.application>,
  "testEnvironment": <testRun.testEnvironment>,
  "testType": <testRun.testType>
})
```

## Generic Report Panels Processing

### 9. Generic Report Panels: `processAutoConfigGenericReportPanels()`
**Location**: `AutoConfigService.kt:146-173`

**Query for GenericReportPanels**:
```javascript
db.genericReportPanels.find({})
```

**Application Dashboards by Template Query** (`AutoConfigFinders.kt:103-110`):
```javascript
db.applicationDashboards.find({
  "templateDashboardUid": <dashboardUid>,
  "application": <application>,
  "testEnvironment": <testEnvironment>
})
```

**Report Panel Existence Query** (`AutoConfigFinders.kt:151-168`):
```javascript
db.reportPanels.find({
  "genericReportPanelId": <reportPanelId>,
  "application": <applicationDashboard.application>,
  "testEnvironment": <applicationDashboard.testEnvironment>,
  "dashboardUid": <applicationDashboard.dashboardUid>,
  "dashboardLabel": <applicationDashboard.dashboardLabel>,
  "testType": <testType>
})
```

## Data Structures

### TestRun Document Structure
```javascript
{
  "_id": String,
  "testRunId": String,
  "application": String,
  "testEnvironment": String, 
  "testType": String,
  "end": Date,
  "tags": [String],
  "variables": [{"placeholder": String, "value": String}],
  "completed": Boolean
}
```

### ApplicationDashboard Document Structure
```javascript
{
  "_id": String,
  "application": String,
  "testEnvironment": String,
  "grafana": String,
  "dashboardName": String,
  "dashboardId": Number,
  "dashboardUid": String, // For readOnly: template UID
  "dashboardLabel": String,
  "snapshotTimeout": Number,
  "templateDashboardUid": String, // For readOnly: template UID  
  "tags": [String],
  "variables": [{"name": String, "values": [String]}]
}
```

### AutoConfigGrafanaDashboard Document Structure
```javascript
{
  "_id": String,
  "profile": String,
  "grafana": String,
  "dashboardName": String,
  "dashboardUid": String, // Template UID
  "readOnly": Boolean,
  "createSeparateDashboardForVariable": String,
  "setHardcodedValueForVariables": [{"name": String, "values": [String]}]
}
```

## Key Differences from Current Node.js Implementation

1. **Field Names**: Uses correct field names (`application`, `testEnvironment`) not (`testType`, `system`, `systemUnderTest`)
2. **ReadOnly Logic**: Properly implemented with template UID reuse
3. **Existence Checks**: Use specific field combinations, not complex fallback logic  
4. **Dashboard UID Generation**: Hashed for regular dashboards, direct template UID for readOnly
5. **Variable Handling**: Processes as structured objects, not direct assignment to query

This analysis provides the foundation for correctly implementing the autoconfig logic in Node.js.