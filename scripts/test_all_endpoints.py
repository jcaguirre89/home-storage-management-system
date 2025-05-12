import requests
import json
import os
import time
import uuid
from seedEmulator import seed_database

# Seed database
# seed_database()

# --- Configuration ---
AUTH_EMULATOR_HOST_PORT = os.environ.get("FIREBASE_AUTH_EMULATOR_HOST", "localhost:9099")
FUNCTIONS_EMULATOR_HOST_PORT = os.environ.get("FIREBASE_FUNCTIONS_EMULATOR_HOST", "localhost:5001")
HOSTING_EMULATOR_HOST_PORT = os.environ.get("FIREBASE_HOSTING_EMULATOR_HOST", "localhost:8080")
PROJECT_ID = os.environ.get("GCLOUD_PROJECT", "home-storage-management-system") # Ensure this matches your project
FUNCTIONS_REGION = "us-central1" # Adjust if your region is different

LOGIN_API_KEY = "emulator-api-key" # Standard for Firebase Auth Emulator

# URLs
AUTH_EMULATOR_LOGIN_URL = f"http://{AUTH_EMULATOR_HOST_PORT}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={LOGIN_API_KEY}"
FUNCTIONS_BASE_URL = f"http://{HOSTING_EMULATOR_HOST_PORT}/api"
REGISTER_ENDPOINT_URL = f"{FUNCTIONS_BASE_URL}/register"
RESET_PASSWORD_ENDPOINT_URL = f"{FUNCTIONS_BASE_URL}/reset_password"

# Item Endpoint Paths will now be relative to the new /api base
ITEMS_RESOURCE_PATH = "items" # This is now a path segment, e.g., /api/items

CREATE_ITEM_URL = f"{FUNCTIONS_BASE_URL}/{ITEMS_RESOURCE_PATH}"
GET_ITEMS_URL = f"{FUNCTIONS_BASE_URL}/{ITEMS_RESOURCE_PATH}"
# Individual item URLs will be constructed dynamically:
# e.g., f"{FUNCTIONS_BASE_URL}/{ITEMS_RESOURCE_PATH}/{{item_id}}" which becomes http://localhost:8080/api/items/{{item_id}}


# Globals to store state during tests
current_id_token = None
main_test_user_email = ""
main_test_user_password = ""
main_test_user_uid = "" # Will be populated after successful registration of the main user
created_item_ids = [] # To store IDs of items created during tests for cleanup or later use

# --- Helper Functions ---
def print_test_header(name):
    separator = "=" * 70
    print(f"\n{separator}")
    print(f"  {name}")
    print(separator)

def print_test_name(name):
    print(f"\n--- 🧪 TESTING: {name} ---")

def print_response_details(response: requests.Response):
    print(f"Status Code: {response.status_code}")
    try:
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))
    except requests.exceptions.JSONDecodeError:
        print("Response Text:")
        print(response.text)

def generate_unique_email(prefix="testuser"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"

# --- Pre-flight Check ---
def pre_flight_check():
    print_test_header("PRE-FLIGHT: Basic Connectivity")
    print(f"Attempting to reach Functions emulator at: {FUNCTIONS_BASE_URL}")
    try:
        # A GET on a POST endpoint will fail, but checks basic reachability of functions emulator
        response = requests.get(REGISTER_ENDPOINT_URL, timeout=5)
        print(f"Connectivity check status: {response.status_code} (expected 405 or similar for GET on POST)")
        if response.status_code == 405: # Method Not Allowed
             print("✅ Functions emulator seems reachable.")
        else:
            print(f"⚠️ Unexpected status for connectivity check: {response.status_code}")
            print_response_details(response)
    except requests.exceptions.ConnectionError as e:
        print(f"❌ CRITICAL: Could not connect to Firebase Functions emulator at {FUNCTIONS_BASE_URL}.")
        print(f"   Error: {e}")
        print("   Please ensure emulators are running (firebase emulators:start).")
        exit(1)
    except requests.exceptions.Timeout:
        print(f"❌ CRITICAL: Connection to Firebase Functions emulator at {FUNCTIONS_BASE_URL} timed out.")
        exit(1)


# --- Auth Test Functions ---
def register_user_via_function(email, password, display_name=None, household_id=None):
    print_test_name(f"Register User: {email} (Household: {household_id or 'None'})")
    payload = {"email": email, "password": password}
    if display_name:
        payload["displayName"] = display_name
    if household_id:
        payload["householdId"] = household_id

    response = requests.post(REGISTER_ENDPOINT_URL, json=payload)
    print_response_details(response)
    return response

def test_registration_scenarios():
    print_test_header("AUTH: Testing /register Endpoint")
    global main_test_user_email, main_test_user_password, main_test_user_uid

    # Scenario 1: Successful registration for the main user who will do item tests
    main_test_user_email = generate_unique_email("main_item_tester")
    main_test_user_password = "securePassword123!"
    print(f"Registering main test user: {main_test_user_email} with no householdId")
    response = register_user_via_function(
        main_test_user_email,
        main_test_user_password,
        display_name="Main Item Tester"
    )
    if response.status_code == 201 and response.json().get("success"):
        main_test_user_uid = response.json().get("data", {}).get("uid")
        print(f"✅ Main test user registered successfully. UID: {main_test_user_uid}")
        if not main_test_user_uid:
            print("❌ CRITICAL: Main test user UID not found in registration response. Cannot proceed with item tests.")
            exit(1)
    else:
        print("❌ CRITICAL: Failed to register main test user. Cannot proceed.")
        exit(1)

    # Scenario 2: Successful registration (minimal, no householdId)
    email_min = generate_unique_email("min_user")
    register_user_via_function(email_min, "password123")

    # Scenario 3: Attempting to register with an existing email (main_test_user_email)
    register_user_via_function(main_test_user_email, "anotherPassword")

    # Scenario 4: Attempting to register with missing password
    email_no_pass = generate_unique_email("no_pass")
    print_test_name(f"Register User: {email_no_pass} (Missing Password)")
    response = requests.post(REGISTER_ENDPOINT_URL, json={"email": email_no_pass})
    print_response_details(response)

    # Scenario 5: Attempting to register with missing email
    print_test_name("Register User: (Missing Email)")
    response = requests.post(REGISTER_ENDPOINT_URL, json={"password": "somepassword"})
    print_response_details(response)

    # Scenario 6: User for password reset tests
    email_for_reset = generate_unique_email("reset_target")
    password_for_reset = "resetPass123"
    register_user_via_function(
        email_for_reset,
        password_for_reset,
        display_name="User For Reset",
    )
    return email_for_reset # Return this email for use in password reset tests

def request_password_reset_via_function(email):
    print_test_name(f"Request Password Reset for: {email or 'MISSING EMAIL'}")
    payload = {}
    if email: # Only include email in payload if it's provided
        payload["email"] = email

    response = requests.post(RESET_PASSWORD_ENDPOINT_URL, json=payload)
    print_response_details(response)
    return response

def test_password_reset_scenarios(email_of_registered_user):
    print_test_header("AUTH: Testing /reset_password Endpoint")

    # Scenario 1: Requesting reset for a newly registered user
    request_password_reset_via_function(email_of_registered_user)

    # Scenario 2: Requesting reset for a non-existent user
    non_existent_email = generate_unique_email("nonexistent")
    request_password_reset_via_function(non_existent_email)

    # Scenario 3: Requesting reset with missing email in payload
    request_password_reset_via_function(None) # Pass None to simulate missing email key

def login_user_direct_auth_emulator(email, password):
    global current_id_token
    print_test_name(f"Login User via Auth Emulator: {email}")
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    try:
        response = requests.post(AUTH_EMULATOR_LOGIN_URL, json=payload)
        print_response_details(response) # Print full response for login
        response.raise_for_status()
        data = response.json()
        current_id_token = data.get("idToken")
        if current_id_token:
            print(f"✅ Successfully obtained ID token for {email}.")
            return True
        else:
            print(f"❌ Error: Could not obtain ID token for {email}. 'idToken' not found.")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Error during login request for {email}: {e}")
        if hasattr(e, 'response') and e.response is not None:
            # Already printed by print_response_details if called
            pass
        return False

# --- Household Management Test Functions ---
def test_create_household(household_name):
    print_test_name(f"Create Household: {household_name}")
    if not current_id_token:
        print("⚠️ Skipping test_create_household: No ID token available.")
        return None # Return None if skipped or failed

    payload = {"name": household_name}
    headers = {
        "Authorization": f"Bearer {current_id_token}",
        "Content-Type": "application/json"
    }
    create_household_url = f"{FUNCTIONS_BASE_URL}/households"

    household_id = None
    response_json = None
    try:
        response = requests.post(create_household_url, json=payload, headers=headers)
        print_response_details(response)
        response_json = response.json() # Store for later access
        if response.status_code == 201 and response_json.get("success") and response_json.get("data", {}).get("id"):
            household_id = response_json["data"]["id"]
            print(f"✅ Household '{household_name}' created successfully with ID: {household_id}")
        elif response.status_code == 400 and response_json.get("error", {}).get("code") == "ALREADY_IN_HOUSEHOLD":
            print(f"✅ Correctly prevented creating a second household: {response_json.get('error',{}).get('message')}")
        else:
            print(f"❌ Error: Household creation for '{household_name}' failed or response format incorrect.")
            if response.status_code // 100 == 2: # if 2xx status but not as expected
                 response.raise_for_status() # Will raise for other 2xx if not 201 with correct body

    except requests.exceptions.RequestException as e:
        print(f"❌ Error during create_household request for '{household_name}': {e}")

    return household_id, response_json # Return ID and full response for further checks

# --- Item Management Test Functions ---
def test_create_item():
    global created_item_ids # Use the list to store IDs
    print_test_name("Create Item (POST /create_item)")
    if not current_id_token:
        print("⚠️ Skipping test_create_item: No ID token available.")
        return None # Return None if skipped or failed

    payload = {
        "name": "Test Item - Python Script Soldering Iron",
        "location": "P1",
        "status": "STORED",
        "isPrivate": False,
        "metadata": {
            "category": "Electronics Tools",
            "notes": f"Created by Python test script for user {main_test_user_email}"
        }
    }
    headers = {
        "Authorization": f"Bearer {current_id_token}",
        "Content-Type": "application/json"
    }
    print(f"Item Create Payload: {json.dumps(payload, indent=2)}")

    item_id = None
    try:
        response = requests.post(CREATE_ITEM_URL, json=payload, headers=headers)
        print_response_details(response)
        response.raise_for_status()
        data = response.json()
        if data.get("success") and data.get("data") and data.get("data").get("id"):
            item_id = data["data"]["id"]
            created_item_ids.append(item_id) # Add to our list
            print(f"✅ Item created successfully with ID: {item_id}")
        else:
            print("❌ Error: Item creation reported success, but ID was not found in response.")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error during create_item request: {e}")
        if hasattr(e, 'response') and e.response is not None:
            # Already printed by print_response_details if it was a direct HTTP error status
            pass # Error is already printed
    return item_id # Return the created ID or None

def test_get_all_items():
    print_test_name("Get All Items (GET /get_items)")
    if not current_id_token:
        print("⚠️ Skipping test_get_all_items: No ID token available.")
        return

    headers = {"Authorization": f"Bearer {current_id_token}"}

    try:
        response = requests.get(GET_ITEMS_URL, headers=headers)
        print_response_details(response)
        response.raise_for_status()
        # Further validation could be added here, e.g., checking if created items appear
        print("✅ Get all items request successful (check output for details).")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error during get_all_items request: {e}")

def test_get_specific_item_by_id(item_id_to_get, expected_status_code=200, test_label_suffix=""):
    test_label = f"Get Specific Item {test_label_suffix}".strip()
    print_test_name(f"{test_label} (GET /get_item/{item_id_to_get})")
    if not current_id_token:
        print(f"⚠️ Skipping {test_label}: No ID token available.")
        return
    if not item_id_to_get:
        print(f"⚠️ Skipping {test_label}: No item_id_to_get provided.")
        return

    url = f"{FUNCTIONS_BASE_URL}/{ITEMS_RESOURCE_PATH}/{item_id_to_get}"
    headers = {"Authorization": f"Bearer {current_id_token}"}

    try:
        response = requests.get(url, headers=headers)
        print_response_details(response)
        if response.status_code == expected_status_code:
            print(f"✅ {test_label} request got expected status {expected_status_code}.")
        else:
            print(f"❌ {test_label} request got status {response.status_code}, expected {expected_status_code}.")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error during {test_label} request: {e}")

def test_update_existing_item(item_id_to_update):
    print_test_name(f"Update Item (PUT /update_item/{item_id_to_update})")
    if not current_id_token:
        print("⚠️ Skipping test_update_existing_item: No ID token available.")
        return
    if not item_id_to_update:
        print("⚠️ Skipping test_update_existing_item: No item_id_to_update provided.")
        return

    url = f"{FUNCTIONS_BASE_URL}/{ITEMS_RESOURCE_PATH}/{item_id_to_update}"
    payload = {
        "name": "Test Item - Soldering Iron (Updated by Python)",
        "location": "P2",
        "status": "OUT",
        "isPrivate": True, # Testing change to private
        "metadata": {
            "category": "Electronics Tools",
            "notes": f"Updated by Python test script for user {main_test_user_email}, needs new tip"
        }
    }
    headers = {
        "Authorization": f"Bearer {current_id_token}",
        "Content-Type": "application/json"
    }
    print(f"Item Update Payload: {json.dumps(payload, indent=2)}")

    try:
        response = requests.put(url, json=payload, headers=headers)
        print_response_details(response)
        response.raise_for_status()
        print(f"✅ Update item {item_id_to_update} request successful.")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error during update_item request for {item_id_to_update}: {e}")

def test_delete_existing_item(item_id_to_delete):
    print_test_name(f"Delete Item (DELETE /delete_item/{item_id_to_delete})")
    if not current_id_token:
        print("⚠️ Skipping test_delete_existing_item: No ID token available.")
        return
    if not item_id_to_delete:
        print("⚠️ Skipping test_delete_existing_item: No item_id_to_delete provided.")
        return

    url = f"{FUNCTIONS_BASE_URL}/{ITEMS_RESOURCE_PATH}/{item_id_to_delete}"
    headers = {"Authorization": f"Bearer {current_id_token}"}

    try:
        response = requests.delete(url, headers=headers)
        print_response_details(response)
        response.raise_for_status()
        if item_id_to_delete in created_item_ids: # Remove from list if deletion successful
            created_item_ids.remove(item_id_to_delete)
        print(f"✅ Delete item {item_id_to_delete} request successful.")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error during delete_item request for {item_id_to_delete}: {e}")

# --- Main Execution ---
if __name__ == "__main__":
    pre_flight_check()

    # Test Auth Endpoints
    email_for_reset_tests = test_registration_scenarios()
    if email_for_reset_tests:
        test_password_reset_scenarios(email_for_reset_tests)
    else:
        print("⚠️ Skipping password reset tests as the target user for reset tests might not have been registered.")

    # Log in the main user to proceed with item tests
    if main_test_user_email and main_test_user_password:
        if login_user_direct_auth_emulator(main_test_user_email, main_test_user_password):
            print_test_header("ITEM MANAGEMENT: Proceeding with Item CRUD Tests")

            # === Create Household for Main User ===
            household_name = f"{main_test_user_email.split('@')[0]}'s Household"
            created_household_id, _ = test_create_household(household_name)
            if not created_household_id:
                print("❌ CRITICAL: Main test user failed to create a household. Cannot proceed with item tests that depend on householdId.")
                # Depending on strictness, you might exit(1) here or allow item tests to fail if they rely on user's householdId
            else:
                print(f"✅ Main test user now associated with household: {created_household_id}")
                # Test attempting to create a second household (should fail)
                test_create_household(f"Second Household Attempt by {main_test_user_email.split('@')[0]}")

            # === Main Item CRUD Flow ===
            first_item_id = test_create_item() # Create a public item

            test_get_all_items() # Get all items, should include the new one

            if first_item_id:
                test_get_specific_item_by_id(first_item_id, test_label_suffix="After Create")
                test_update_existing_item(first_item_id) # Update it (e.g., make it private)
                test_get_specific_item_by_id(first_item_id, test_label_suffix="After Update")
                # test_get_all_items() # Optional: Verify how listing changes after update (e.g. if it became private)
                test_delete_existing_item(first_item_id)
                test_get_specific_item_by_id(first_item_id, expected_status_code=404, test_label_suffix="After Delete (Should be 404)")
            else:
                print("⚠️ Skipping parts of item CRUD flow as first_item_id was not obtained.")

            # === Second Item (e.g., explicitly private by main user) ===
            # The original `test_create_private_item` logic can be merged into `test_create_item` with a parameter
            # or called as a separate test. Let's create another distinct item for clarity.
            print_test_name("Create Second Item (Private by Main User)")
            private_item_payload = {
                "name": "Main User Private Diary",
                "location": "SPS1",
                "status": "STORED",
                "isPrivate": True,
                "metadata": {"notes": f"Super secret, created by {main_test_user_email}"}
            }
            headers = {
                "Authorization": f"Bearer {current_id_token}",
                "Content-Type": "application/json"
            }
            second_item_id = None
            try:
                response = requests.post(CREATE_ITEM_URL, json=private_item_payload, headers=headers)
                print_response_details(response)
                response.raise_for_status()
                data = response.json()
                if data.get("success") and data.get("data") and data.get("data").get("id"):
                    second_item_id = data["data"]["id"]
                    created_item_ids.append(second_item_id)
                    print(f"✅ Second (private) item created successfully with ID: {second_item_id}")
                else:
                    print("❌ Error: Second item creation reported success, but ID was not found.")
            except requests.exceptions.RequestException as e:
                print(f"❌ Error during second item creation: {e}")

            if second_item_id:
                test_get_specific_item_by_id(second_item_id, test_label_suffix="Private Item by Main User")
                # (Optional: Add test to try and get this item with another user's token - should fail)
                test_delete_existing_item(second_item_id) # Cleanup
                test_get_specific_item_by_id(second_item_id, expected_status_code=404, test_label_suffix="Private Item After Delete (Should be 404)")

            # Optional: Attempt to clean up any remaining items if script was interrupted before delete
            # print("\nAttempting to clean up any remaining test items...")
            # for item_id_to_clean in list(created_item_ids): # Iterate over a copy
            #     print(f"Cleaning up item: {item_id_to_clean}")
            #     test_delete_existing_item(item_id_to_clean)

        else:
            print("❌ CRITICAL: Login failed for main test user. Cannot proceed with item tests.")
    else:
        print("❌ CRITICAL: Main test user credentials not set. Cannot proceed with login and item tests.")

    print_test_header("All Tests Concluded")
    print("👉 Remember to check Firestore Emulator Data UI and Auth Emulator UI.")
    print("👉 Ensure 'requests' library is installed (pip install requests).")