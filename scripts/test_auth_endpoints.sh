#!/bin/bash

# Firebase Project ID and Region - REPLACE THESE WITH YOUR ACTUAL VALUES
# Ensure these match the project and region your emulators are configured for.
FIREBASE_PROJECT_ID="home-storage-management-system" # Replace with your Firebase project ID
FIREBASE_REGION="us-central1"     # Replace with your functions region if different

# Emulator base URL for functions
BASE_URL="http://localhost:5001/$FIREBASE_PROJECT_ID/$FIREBASE_REGION"

# Predefined Household IDs from your seedEmulator.py (if you want to use them)
# Ensure your seedEmulator.py has been run if you rely on these households existing for other tests.
# For the /register endpoint, these are just strings; the household doesn't strictly need to exist in Firestore
# for the registration itself to succeed, but it would for subsequent data integrity.
HOUSEHOLD_ID_ALPHA="household-alpha"
HOUSEHOLD_ID_BETA="household-beta"

# --- Helper function to print test headers ---
echo_header() {
    echo ""
    echo "======================================================================"
    echo "  $1"
    echo "======================================================================"
    echo ""
}

# Generate a unique part for emails to allow rerunning the script
UNIQUE_ID=$(date +%s)
USER_EMAIL_MINIMAL="testuser_min_${UNIQUE_ID}@example.com"
USER_EMAIL_FULL="testuser_full_${UNIQUE_ID}@example.com"
USER_EMAIL_FOR_RESET="reset_test_${UNIQUE_ID}@example.com"
USER_PASSWORD="securePassword123!"

# Ensure Emulators are running and seed script has populated Firestore if necessary
# (This script doesn't run the seed script, it assumes you have done so if needed)

echo_header "PRE-FLIGHT: Testing basic connectivity to Functions Emulator"
http GET ${BASE_URL}/register # Using GET on POST endpoint will fail, but tests connectivity

# --- Registration Tests ---
echo_header "TESTING /register ENDPOINT"

echo "[TEST] Register: Successful registration (minimal, no householdId)"
http POST ${BASE_URL}/register \
  email="$USER_EMAIL_MINIMAL" \
  password="$USER_PASSWORD" 

echo "
[TEST] Register: Successful registration (with displayName and known householdId: $HOUSEHOLD_ID_ALPHA)"
http POST ${BASE_URL}/register \
  email="$USER_EMAIL_FULL" \
  password="$USER_PASSWORD" \
  displayName="Test User Full ${UNIQUE_ID}" \
  householdId="$HOUSEHOLD_ID_ALPHA"


echo "
[TEST] Register: Successful registration for user whose password will be reset (using $HOUSEHOLD_ID_BETA)"
http POST ${BASE_URL}/register \
  email="$USER_EMAIL_FOR_RESET" \
  password="$USER_PASSWORD" \
  displayName="User For Reset ${UNIQUE_ID}" \
  householdId="$HOUSEHOLD_ID_BETA"

echo "
[TEST] Register: Attempting to register with an existing email ($USER_EMAIL_MINIMAL)"
http POST ${BASE_URL}/register \
  email="$USER_EMAIL_MINIMAL" \
  password="anotherPassword"

echo "
[TEST] Register: Attempting to register with missing password"
http POST ${BASE_URL}/register \
  email="missingpass_${UNIQUE_ID}@example.com"

echo "
[TEST] Register: Attempting to register with missing email"
http POST ${BASE_URL}/register \
  password="somepassword"

# --- Password Reset Tests ---
echo_header "TESTING /reset_password ENDPOINT"

echo "
[TEST] Reset Password: Requesting reset for newly registered user ($USER_EMAIL_FOR_RESET)"
# This user was created by this script, so they exist in the Auth emulator.
http POST ${BASE_URL}/reset_password \
  email="$USER_EMAIL_FOR_RESET"

echo "
[TEST] Reset Password: Requesting reset for a non-existent user (in Auth emulator)"
http POST ${BASE_URL}/reset_password \
  email="truly_nonexistent_${UNIQUE_ID}@example.com"

# Note: Testing reset for an email like 'alice@example.com' (from seedEmulator.py)
# would only work as expected if 'alice@example.com' was also created in the AUTH EMULATOR.
# Your seedEmulator.py populates Firestore, not the Auth emulator.
# The test above for USER_EMAIL_FOR_RESET is a more reliable test of the /reset_password flow.

echo "
[TEST] Reset Password: Requesting reset with missing email"
http POST ${BASE_URL}/reset_password

echo ""
echo "----------------------------------------------------------------------"
echo "All tests completed."
echo "REMEMBER:"
echo "1. Replace FIREBASE_PROJECT_ID and FIREBASE_REGION placeholders in this script."
echo "2. Make this script executable (chmod +x test_auth_endpoints.sh)."
echo "3. Ensure Firebase Emulators are running (firebase emulators:start)."
# echo "4. Run your seedEmulator.py if your tests depend on that Firestore data for other interactions."
echo "5. Check the Firebase Emulator UI (http://localhost:4000) for Auth and Firestore states, and function logs."
echo "----------------------------------------------------------------------"