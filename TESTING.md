# Testing Guide for Home Storage System

This document outlines how to run the various tests set up for this project.

## Prerequisites

1.  **Node.js and npm**: Ensure you have a recent LTS version of Node.js and npm installed.
2.  **Firebase Tools**: While installed as a project dependency, you might interact with it directly.
3.  **Java Development Kit (JDK)**: Required for the Firebase Firestore emulator. Version 11 or higher is recommended.

## Setup

1.  **Install Root Dependencies**:
    ```bash
    npm install
    ```

2.  **Install Frontend Dependencies**:
    ```bash
    cd frontend
    npm install
    cd ..
    ```
    (Or `npm install --prefix frontend` from the root directory).

3.  **Firebase Emulator Data (Optional but Recommended)**:
    The emulators are configured to import data from `./firebase-emulator-data` on startup and export on exit.
    This directory has been created. If you have specific seed data, you can place it there according to Firebase documentation.

## Running Firebase Emulators

To run tests that interact with Firebase services (Firestore rules, Functions integration, E2E tests that use the backend), you need the Firebase Emulators running.

```bash
# From the root directory
npm run emulators:start
```
This will start the Auth, Firestore, Functions, and Hosting emulators. The Emulator UI will be available at `http://localhost:4000`.

## Running Tests

It's generally recommended to have the Firebase Emulators running in a separate terminal when executing tests that require them (all except Svelte unit tests).

### 1. Svelte Component Unit Tests

These tests verify individual Svelte components in isolation.

```bash
# From the frontend directory
cd frontend
npm run test:unit:run

# Or from the root directory
npm run test:unit:run --prefix frontend
```

### 2. Firestore Security Rules Tests

These tests validate your `firestore.rules` file against the Firestore emulator.

*Ensure emulators are running.*

```bash
# From the frontend directory
cd frontend
npm run test:rules

# Or from the root directory
npm run test:rules --prefix frontend
```

Alternatively, you can run them via `firebase emulators:exec` which starts emulators, runs the script, and then shuts them down (useful for CI or a clean one-off run):

```bash
# From the root directory
npm run emulators:exec:rules
```

### 3. Firebase Functions Integration Tests

These tests verify your Firebase Functions (Python) by making HTTP calls to the Functions emulator.

*Ensure emulators are running.*

```bash
# From the frontend directory
cd frontend
npm run test:functions

# Or from the root directory
npm run test:functions --prefix frontend
```

### 4. Combined Integration Tests (Rules + Functions)

*Ensure emulators are running.*

```bash
# From the frontend directory
cd frontend
npm run test:integration

# Or from the root directory
npm run test:integration --prefix frontend
```

To run all integration tests via `emulators:exec`:
```bash
# From the root directory
npm run emulators:exec:all
```

### 5. All JavaScript/TypeScript Tests (Unit + Integration)

This script runs Svelte unit tests and then the integration tests (rules and functions).

*Ensure emulators are running for the integration part.*

```bash
# From the frontend directory
cd frontend
npm run test

# Or from the root directory
npm run test --prefix frontend
```

### 6. Cypress End-to-End (E2E) Tests

E2E tests run against your full application (frontend + emulated backend).

**Steps to run locally:**

1.  **Start Firebase Emulators** (if not already running):
    ```bash
    # From the root directory
    npm run emulators:start
    ```
2.  **Start the Svelte Development Server**:
    ```bash
    # From the frontend directory
    cd frontend
    npm run dev
    ```
3.  **Run Cypress Tests**:
    *   To open the Cypress Test Runner UI:
        ```bash
        # From the frontend directory (in a new terminal)
        cd frontend
        npm run e2e
        ```
    *   To run Cypress tests headlessly in the terminal (like in CI):
        ```bash
        # From the frontend directory
        cd frontend
        npm run e2e:run
        ```

### 7. Code Coverage

To generate a code coverage report for your Svelte components and frontend TypeScript/JavaScript logic (excluding tests themselves):

```bash
# From the frontend directory
cd frontend
npm run coverage
```
Coverage reports (HTML, JSON, text) will be available in `frontend/coverage/`.

## CI (GitHub Actions)

A GitHub Actions workflow is configured in `.github/workflows/ci.yml`. It automatically runs:
- Svelte Unit Tests
- Firebase Emulators Setup
- Firestore Rules & Functions Integration Tests
- Svelte App Build
- Cypress E2E Tests

This runs on every push and pull request to the `main` (or `master`) branch.