# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

from firebase_functions import https_fn, options
from firebase_admin import auth, firestore
import firebase_admin
import json # Import for json.dumps if needed, or direct dict passing
import functools # Added for wrapper
import re # Import for regular expressions
import csv
import io

try:
    # This will work in Firebase Functions environment automatically
    firebase_admin.initialize_app()
except ValueError as e:
    # App already initialized
    pass

# Don't initialize here - do it lazily
db = None

def get_db():
    """Lazy initialization of Firestore client"""
    global db
    if db is None:
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        db = firestore.client()
    return db

# CORS options for development (adjust for production)
# options.set_global_options(cors=options.CorsOptions(cors_origins="*", cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])) # This line caused TypeError


# --- Helper Functions ---
def get_user_data_from_firestore(user_id: str) -> dict | None:
    """Fetches user data from Firestore.

    Args:
        user_id: The UID of the user.

    Returns:
        A dictionary containing the user's data or None if not found.
    """
    db = get_db()
    user_doc_ref = db.collection("users").document(user_id)
    user_doc = user_doc_ref.get()
    if user_doc.exists:
        return user_doc.to_dict()
    return None


def get_user_by_email(email: str) -> dict | None:
    """Fetches a user from Firestore by their email address."""
    db = get_db()
    users_ref = db.collection("users")
    query = users_ref.where("email", "==", email).limit(1)
    results = query.stream()
    for user in results:
        user_data = user.to_dict()
        user_data["id"] = user.id
        return user_data
    return None

def require_auth(f):
    """Decorator to check for Firebase Authentication ID token."""
    @functools.wraps(f)
    def decorated_function(req: https_fn.Request, *args, **kwargs):
        # Check for Authorization header
        auth_header = req.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return https_fn.Response(
                status=401,
                response=json.dumps({"success": False, "error": {"code": "UNAUTHENTICATED", "message": "Missing or invalid Authorization token."}}),
                mimetype="application/json"
            )

        id_token = auth_header.split("Bearer ")[1]
        try:
            decoded_token = auth.verify_id_token(id_token)
            req.user = decoded_token # Attach user info to the request object
            return f(req, *args, **kwargs)
        except auth.RevokedIdTokenError:
            return https_fn.Response(
                status=401,
                response=json.dumps({"success": False, "error": {"code": "TOKEN_REVOKED", "message": "ID token has been revoked."}}),
                mimetype="application/json"
            )
        except auth.UserDisabledError:
            return https_fn.Response(
                status=401,
                response=json.dumps({"success": False, "error": {"code": "USER_DISABLED", "message": "User account has been disabled."}}),
                mimetype="application/json"
            )
        except auth.InvalidIdTokenError:
            return https_fn.Response(
                status=401,
                response=json.dumps({"success": False, "error": {"code": "INVALID_TOKEN", "message": "Invalid ID token."}}),
                mimetype="application/json"
            )
        except Exception as e:
            return https_fn.Response(
                status=500,
                response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": "An error occurred during authentication."}}),
                mimetype="application/json"
            )
    return decorated_function


# --- Auth Endpoints (Existing) ---
def _register_logic(req: https_fn.Request) -> https_fn.Response:
    """
    Registers a new user with email and password,
    and creates a corresponding user document in Firestore.
    householdId is now optional.
    """
    if req.method != "POST":
        return https_fn.Response(
            status=405,
            response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}),
            mimetype="application/json"
        )

    try:
        data = req.get_json()
        email = data.get("email")
        password = data.get("password")
        display_name = data.get("displayName")
        if not display_name: # If displayName is not provided or is an empty string
            display_name = email # Use email as display name
        household_id = data.get("householdId") # Now optional

        if not email or not password:
            return https_fn.Response(
                status=400,
                response=json.dumps({"success": False, "error": {"code": "MISSING_FIELDS", "message": "Email and password are required."}}),
                mimetype="application/json"
            )

        # household_id is no longer strictly required at registration
        # if not household_id: # As per your schema, householdId is required for a user
        #     return https_fn.Response(
        #         status=400,
        #         response=jsonify({"success": False, "error": {"code": "MISSING_HOUSEHOLD_ID", "message": "Household ID is required to register."}})
        #     )


        # Create user with Firebase Authentication
        user_record = auth.create_user(
            email=email,
            password=password,
            display_name=display_name
        )

        user_data = {
            "email": user_record.email,
            "displayName": user_record.display_name if user_record.display_name else "",
            # "householdId": household_id, # This needs to be handled, e.g. created/joined first
            "created": firestore.SERVER_TIMESTAMP,
            "lastLogin": firestore.SERVER_TIMESTAMP # Initial lastLogin on creation
        }
        if household_id: # Only add householdId if provided
            user_data["householdId"] = household_id
        else:
            user_data["householdId"] = None # Explicitly set to None if not provided

        db = get_db()  # Get the db instance

        # create user document in firestore
        user_ref = db.collection("users").document(user_record.uid)
        user_ref.set(user_data)

        # For security, don't return password or full user_record unless necessary.
        # The tech design doc does not specify returning a JWT on register, only on login.
        response_dict = {
            "success": True,
            "data": {"uid": user_record.uid, "email": user_record.email},
            "error": None
        }
        return https_fn.Response(
            status=201,
            response=json.dumps(response_dict),
            mimetype="application/json"
        )

    except auth.EmailAlreadyExistsError:
        return https_fn.Response(
            status=400,
            response=json.dumps({"success": False, "error": {"code": "EMAIL_ALREADY_EXISTS", "message": "The email address is already in use by another account."}}),
            mimetype="application/json"
        )
    except Exception as e:
        # Log the exception for debugging
        return https_fn.Response(
            status=500,
            response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}}),
            mimetype="application/json"
        )

def _reset_password_logic(req: https_fn.Request) -> https_fn.Response:
    """
    Initiates the password reset process for a given email.
    Firebase Auth will send a password reset email to the user.
    Returns a generic success message regardless of user existence for security.
    """
    if req.method != "POST":
        return https_fn.Response(
            status=405,
            response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}),
            mimetype="application/json"
        )

    try:
        # Use silent=True to prevent get_json from raising an error on non-JSON body
        data = req.get_json(silent=True)
        email = None
        if data is not None:
            email = data.get("email")

        # Check if email was provided in the JSON payload
        if not email:
            return https_fn.Response(
                status=400,
                response=json.dumps({"success": False, "error": {"code": "MISSING_EMAIL", "message": "Email is required in the JSON payload."}}),
                mimetype="application/json"
            )

        try:
            # Attempt to generate the password reset link
            auth.generate_password_reset_link(email)
        except auth.UserNotFoundError:
            # If user is not found, we don't treat it as an error from the client's perspective.
            # We proceed to send the same generic success message.
            pass
        # Other auth specific errors (e.g. invalid email format for the auth sdk)
        # will be caught by the broader Exception below if not handled explicitly.

        # Always return a generic success message to avoid disclosing user existence.
        return https_fn.Response(
            status=200,
            response=json.dumps({"success": True, "data": {"message": "If an account exists for this email, a password reset link has been sent."}, "error": None}),
            mimetype="application/json"
        )
    except Exception as e:
        # Log the actual error on the server side for debugging
        return https_fn.Response(
            status=500,
            response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred while processing your request."}}),
            mimetype="application/json"
        )


# --- Item Management Endpoints ---

# @https_fn.on_request() # DECORATOR REMOVED
# @require_auth # DECORATOR REMOVED
def _create_item_logic(req: https_fn.Request) -> https_fn.Response: # RENAMED
    """Creates a new item in Firestore.

    Requires Authentication.
    The item's householdId is derived from the authenticated user's profile.
    creatorUserId is set to the authenticated user's UID.
    """
    if req.method != "POST":
        return https_fn.Response(status=405, response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}), mimetype="application/json")

    try:
        data = req.get_json()
        if not data:
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "MISSING_BODY", "message": "Request body is missing or not JSON."}}), mimetype="application/json")

        name = data.get("name")
        location = data.get("location") # e.g., "A1"-"D4"
        status = data.get("status", "STORED") # Default to STORED
        is_private = data.get("isPrivate", False) # Default to False (public within household)
        metadata = data.get("metadata", {}) # Optional metadata object

        if not name or not location:
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "MISSING_FIELDS", "message": "'name' and 'location' are required."}}), mimetype="application/json")

        # Validate location format
        if not isinstance(location, dict) or "roomId" not in location or "binNumber" not in location:
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "INVALID_LOCATION_FORMAT", "message": "Location must be an object with 'roomId' and 'binNumber'."}}), mimetype="application/json")

        room_id = location["roomId"]
        bin_number = location["binNumber"]

        if not isinstance(bin_number, int) or bin_number <= 0:
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "INVALID_BIN_NUMBER", "message": "binNumber must be a positive integer."}}), mimetype="application/json")

        if status not in ["STORED", "OUT"]:
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "INVALID_STATUS", "message": "'status' must be either 'STORED' or 'OUT'."}}), mimetype="application/json")

        if not isinstance(is_private, bool):
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "INVALID_ISPRIVATE", "message": "'isPrivate' must be a boolean."}}), mimetype="application/json")

        auth_user_uid = req.user["uid"]
        user_profile = get_user_data_from_firestore(auth_user_uid)

        if not user_profile or not user_profile.get("householdId"):
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "USER_NOT_IN_HOUSEHOLD", "message": "User must belong to a household to create items."}}), mimetype="application/json")

        household_id = user_profile["householdId"]
        
        db = get_db()
        # Validate room exists and bin number is valid
        room_ref = db.collection("households").document(household_id).collection("rooms").document(room_id)
        room_doc = room_ref.get()
        if not room_doc.exists:
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "ROOM_NOT_FOUND", "message": "The specified room does not exist in this household."}}), mimetype="application/json")

        room_data = room_doc.to_dict()
        if bin_number > room_data.get("nBins", 0):
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "BIN_NUMBER_OUT_OF_RANGE", "message": f"binNumber exceeds the number of bins available in this room ({room_data.get('nBins', 0)})."}}), mimetype="application/json")

        item_data = {
            "name": name,
            "location": location,
            "status": status,
            "creatorUserId": auth_user_uid,
            "householdId": household_id,
            "isPrivate": is_private,
            "lastUpdated": firestore.SERVER_TIMESTAMP,
            "metadata": metadata
        }

        item_ref = db.collection("items").add(item_data)
        created_item_id = item_ref[1].id

        new_item_doc = db.collection("items").document(created_item_id).get()
        if not new_item_doc.exists:
            return https_fn.Response(status=500, response=json.dumps({"success": False, "error": {"code": "CREATE_FAILED", "message": "Failed to retrieve item after creation."}}), mimetype="application/json")

        response_data = new_item_doc.to_dict()
        response_data["id"] = created_item_id
        if 'lastUpdated' in response_data and hasattr(response_data['lastUpdated'], 'isoformat'):
            response_data['lastUpdated'] = response_data['lastUpdated'].isoformat()

        return https_fn.Response(status=201, response=json.dumps({"success": True, "data": response_data, "error": None}), mimetype="application/json")

    except Exception as e:
        if isinstance(e, json.JSONDecodeError) or "Failed to decode JSON" in str(e):
             return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "INVALID_JSON", "message": f"Invalid JSON payload: {str(e)}"}}), mimetype="application/json")
        return https_fn.Response(status=500, response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}}), mimetype="application/json")

def _update_item_logic(req: https_fn.Request, actual_item_id: str) -> https_fn.Response:
    """Updates an existing item.

    Requires Authentication.
    creatorUserId and householdId cannot be changed.
    Access is controlled by Firestore security rules (owner for private, household for public).
    The actual_item_id is passed as a parameter.
    """
    if req.method != "PUT":
        return https_fn.Response(status=405, response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}), mimetype="application/json")

    if not actual_item_id: # Still useful to check
        return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "MISSING_ITEM_ID", "message": "Item ID is required for update."}}), mimetype="application/json")

    try:
        data = req.get_json()
        if not data:
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "MISSING_BODY", "message": "Request body is missing or not JSON for update."}}), mimetype="application/json")

        item_doc_ref = db.collection("items").document(actual_item_id)
        item_doc = item_doc_ref.get()

        if not item_doc.exists:
            return https_fn.Response(status=404, response=json.dumps({"success": False, "error": {"code": "ITEM_NOT_FOUND", "message": "Item to update not found."}}), mimetype="application/json")

        existing_item_data = item_doc.to_dict()
        auth_user_uid = req.user["uid"]
        user_profile = get_user_data_from_firestore(auth_user_uid)

        # Preliminary check for household and ownership (Firestore rules are primary)
        if not user_profile or existing_item_data.get("householdId") != user_profile.get("householdId"):
             return https_fn.Response(status=403, response=json.dumps({"success": False, "error": {"code": "FORBIDDEN", "message": "User cannot update item in this household."}}), mimetype="application/json")
        if existing_item_data.get("isPrivate") and existing_item_data.get("creatorUserId") != auth_user_uid:
            return https_fn.Response(status=403, response=json.dumps({"success": False, "error": {"code": "FORBIDDEN", "message": "User cannot update this private item."}}), mimetype="application/json")
        # If public, any household member can update as per tech doc (rules should enforce this)

        update_payload = {}
        allowed_fields = ["name", "location", "status", "isPrivate", "metadata"]
        for field in allowed_fields:
            if field in data:
                update_payload[field] = data[field]

        if "status" in update_payload and update_payload["status"] not in ["STORED", "OUT"]:
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "INVALID_STATUS", "message": "'status' must be either 'STORED' or 'OUT'."}}), mimetype="application/json")
        if "isPrivate" in update_payload and not isinstance(update_payload["isPrivate"], bool):
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "INVALID_ISPRIVATE", "message": "'isPrivate' must be a boolean."}}), mimetype="application/json")
        if "location" in update_payload:
            location = update_payload["location"]
            if not isinstance(location, dict) or "roomId" not in location or "binNumber" not in location:
                return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "INVALID_LOCATION_FORMAT", "message": "Location must be an object with 'roomId' and 'binNumber'."}}), mimetype="application/json")

            room_id = location["roomId"]
            bin_number = location["binNumber"]

            if not isinstance(bin_number, int) or bin_number <= 0:
                return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "INVALID_BIN_NUMBER", "message": "binNumber must be a positive integer."}}), mimetype="application/json")

            db = get_db()

            household_id = existing_item_data.get("householdId")
            room_ref = db.collection("households").document(household_id).collection("rooms").document(room_id)
            room_doc = room_ref.get()
            if not room_doc.exists:
                return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "ROOM_NOT_FOUND", "message": "The specified room does not exist in this household."}}), mimetype="application/json")

            room_data = room_doc.to_dict()
            if bin_number > room_data.get("nBins", 0):
                return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "BIN_NUMBER_OUT_OF_RANGE", "message": f"binNumber exceeds the number of bins available in this room ({room_data.get('nBins', 0)})."}}), mimetype="application/json")

        if not update_payload:
             return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "NO_UPDATE_FIELDS", "message": "No valid fields provided for update."}}), mimetype="application/json")

        update_payload["lastUpdated"] = firestore.SERVER_TIMESTAMP

        item_doc_ref.update(update_payload)

        updated_item_doc = item_doc_ref.get() # Fetch after update
        response_data = updated_item_doc.to_dict()
        response_data["id"] = updated_item_doc.id
        if 'lastUpdated' in response_data and hasattr(response_data['lastUpdated'], 'isoformat'):
            response_data['lastUpdated'] = response_data['lastUpdated'].isoformat()

        return https_fn.Response(status=200, response=json.dumps({"success": True, "data": response_data, "error": None}), mimetype="application/json")

    except Exception as e:
        return https_fn.Response(status=500, response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}}), mimetype="application/json")

def _delete_item_logic(req: https_fn.Request, actual_item_id: str) -> https_fn.Response:
    """Deletes an item.
    Requires Authentication.
    Access is controlled by Firestore security rules (owner for private, household for public).
    The actual_item_id is passed as a parameter.
    """
    if req.method != "DELETE":
        return https_fn.Response(status=405, response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}), mimetype="application/json")

    # Path parsing logic REMOVED
    # path_parts = req.path.strip("/").split("/")
    # if len(path_parts) < 2 or path_parts[0] != "items":
    #     return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "INVALID_PATH", "message": "Item ID not found in path for delete."}}), mimetype="application/json")
    # actual_item_id = path_parts[-1]

    if not actual_item_id: # Still useful to check
        return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "MISSING_ITEM_ID", "message": "Item ID is required for delete."}}), mimetype="application/json")

    try:
        db = get_db()
        item_doc_ref = db.collection("items").document(actual_item_id)
        item_doc = item_doc_ref.get()

        if not item_doc.exists:
            return https_fn.Response(status=404, response=json.dumps({"success": False, "error": {"code": "ITEM_NOT_FOUND", "message": "Item to delete not found."}}), mimetype="application/json")

        existing_item_data = item_doc.to_dict()
        auth_user_uid = req.user["uid"]
        user_profile = get_user_data_from_firestore(auth_user_uid)

        # Preliminary check for household and ownership (Firestore rules are primary)
        if not user_profile or existing_item_data.get("householdId") != user_profile.get("householdId"):
             return https_fn.Response(status=403, response=json.dumps({"success": False, "error": {"code": "FORBIDDEN", "message": "User cannot delete item in this household."}}), mimetype="application/json")
        if existing_item_data.get("isPrivate") and existing_item_data.get("creatorUserId") != auth_user_uid:
            return https_fn.Response(status=403, response=json.dumps({"success": False, "error": {"code": "FORBIDDEN", "message": "User cannot delete this private item."}}), mimetype="application/json")
        # If public, any household member can delete as per tech doc (rules should enforce this)

        item_doc_ref.delete()
        return https_fn.Response(status=200, response=json.dumps({"success": True, "data": {"message": f"Item {actual_item_id} deleted successfully."}}), mimetype="application/json")

    except Exception as e:
        return https_fn.Response(status=500, response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}}), mimetype="application/json")

# @https_fn.on_request() # DECORATOR REMOVED
# @require_auth # DECORATOR REMOVED
def _get_items_logic(req: https_fn.Request) -> https_fn.Response: # RENAMED from get_items
    """Lists items accessible to the authenticated user.

    Requires Authentication.
    Filters items based on the user's householdId and item's isPrivate status.
    Relies on Firestore security rules for fine-grained access control.
    """
    if req.method != "GET":
        return https_fn.Response(status=405, response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}), mimetype="application/json")

    try:
        auth_user_uid = req.user["uid"]
        user_profile = get_user_data_from_firestore(auth_user_uid)

        if not user_profile or not user_profile.get("householdId"):
             # This case might be handled by security rules, but an early check can be useful.
             # Or, if a user can exist without a household initially, they just won't see any items.
            return https_fn.Response(status=200, response=json.dumps({"success": True, "data": [], "error": None}), mimetype="application/json")

        household_id = user_profile["householdId"]
        db = get_db()
        items_query = db.collection("items")\
            .where(filter=firestore.FieldFilter("householdId", "==", household_id))
        # Further filtering for isPrivate items would ideally be handled by Firestore security rules.
        # If we must do it here, it's less efficient as we fetch then filter in code:
        # docs = items_query.stream()
        # accessible_items = []
        # for doc in docs:
        #     item = doc.to_dict()
        #     item_id = doc.id
        #     if not item.get('isPrivate') or item.get('creatorUserId') == auth_user_uid:
        #         item['id'] = item_id
        #         if 'lastUpdated' in item and hasattr(item['lastUpdated'], 'isoformat'):
        #             item['lastUpdated'] = item['lastUpdated'].isoformat()
        #         accessible_items.append(item)
        # However, relying on security rules is better. The query above gets all household items.
        # The rules will then filter out private items not owned by the user during the read operation.

        docs = items_query.stream()
        items_list = []
        for doc in docs:
            item_data = doc.to_dict()
            item_data["id"] = doc.id
            # Ensure lastUpdated is JSON serializable
            if 'lastUpdated' in item_data and hasattr(item_data['lastUpdated'], 'isoformat'):
                item_data['lastUpdated'] = item_data['lastUpdated'].isoformat()
            items_list.append(item_data)

        return https_fn.Response(status=200, response=json.dumps({"success": True, "data": items_list, "error": None}), mimetype="application/json")

    except Exception as e:
        return https_fn.Response(status=500, response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}}), mimetype="application/json")

def _get_profile_logic(req: https_fn.Request) -> https_fn.Response:
    """Gets the authenticated user's profile data from Firestore.

    Requires Authentication.
    """
    if req.method != "GET":
        return https_fn.Response(
            status=405,
            response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}),
            mimetype="application/json"
        )

    try:
        auth_user_uid = req.user["uid"]
        user_profile = get_user_data_from_firestore(auth_user_uid)

        if not user_profile:
            return https_fn.Response(
                status=404,
                response=json.dumps({"success": False, "error": {"code": "USER_PROFILE_NOT_FOUND", "message": "User profile not found in Firestore."}}),
                mimetype="application/json"
            )

        # Ensure timestamps are serializable if present
        if 'created' in user_profile and hasattr(user_profile['created'], 'isoformat'):
            user_profile['created'] = user_profile['created'].isoformat()
        if 'lastLogin' in user_profile and hasattr(user_profile['lastLogin'], 'isoformat'):
            user_profile['lastLogin'] = user_profile['lastLogin'].isoformat()

        return https_fn.Response(
            status=200,
            response=json.dumps({"success": True, "data": user_profile, "error": None}),
            mimetype="application/json"
        )

    except Exception as e:
        return https_fn.Response(
            status=500,
            response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}}),
            mimetype="application/json"
        )

# @https_fn.on_request() # DECORATOR REMOVED
# @require_auth # DECORATOR REMOVED
def _get_item_logic(req: https_fn.Request, actual_item_id: str) -> https_fn.Response: # RENAMED and signature CHANGED
    """Gets a specific item by its ID.
    Requires Authentication.
    Relies on Firestore security rules for access control.
    The actual_item_id is passed as a parameter.
    """
    if req.method != "GET":
        return https_fn.Response(status=405, response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}), mimetype="application/json")

    # Path parsing logic REMOVED as actual_item_id is now a direct parameter
    # path_parts = req.path.strip("/").split("/")
    # if len(path_parts) < 2 or path_parts[0] != "items":
    #     return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "INVALID_PATH", "message": "Item ID not found in path."}}), mimetype="application/json")
    # actual_item_id = path_parts[-1]

    if not actual_item_id: # Still useful to check if an empty string was somehow passed
        return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "MISSING_ITEM_ID", "message": "Item ID is required."}}), mimetype="application/json")

    try:
        db = get_db()
        item_doc_ref = db.collection("items").document(actual_item_id)
        item_doc = item_doc_ref.get()

        if not item_doc.exists:
            return https_fn.Response(status=404, response=json.dumps({"success": False, "error": {"code": "ITEM_NOT_FOUND", "message": "Item not found."}}), mimetype="application/json")

        item_data = item_doc.to_dict()

        # Security check based on tech doc (though Firestore rules should enforce this primarily)
        auth_user_uid = req.user["uid"]
        user_profile = get_user_data_from_firestore(auth_user_uid)

        if not user_profile or not user_profile.get("householdId"):
            # This should ideally be caught by Firestore rules if user has no householdId
            return https_fn.Response(status=403, response=json.dumps({"success": False, "error": {"code": "FORBIDDEN", "message": "User not associated with a household."}}), mimetype="application/json")

        # If item is private, only creator can access.
        # If item is public, only members of the same household can access.
        # These checks are secondary to Firestore rules.
        if item_data.get("householdId") != user_profile.get("householdId"):
            return https_fn.Response(status=403, response=json.dumps({"success": False, "error": {"code": "FORBIDDEN", "message": "Access to this item is restricted (household mismatch)."}}), mimetype="application/json")

        if item_data.get("isPrivate") and item_data.get("creatorUserId") != auth_user_uid:
            return https_fn.Response(status=403, response=json.dumps({"success": False, "error": {"code": "FORBIDDEN", "message": "Access to this private item is restricted."}}), mimetype="application/json")

        item_data["id"] = item_doc.id
        if 'lastUpdated' in item_data and hasattr(item_data['lastUpdated'], 'isoformat'):
            item_data['lastUpdated'] = item_data['lastUpdated'].isoformat()

        return https_fn.Response(status=200, response=json.dumps({"success": True, "data": item_data, "error": None}), mimetype="application/json")

    except Exception as e:
        return https_fn.Response(status=500, response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}}), mimetype="application/json")


# --- Household Management Logic ---
def _create_household_logic(req: https_fn.Request) -> https_fn.Response:
    """Creates a new household and assigns the authenticated user as the owner.
    Updates the user's profile with the new householdId.
    """
    if req.method != "POST":
        return https_fn.Response(status=405, response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed."}}), mimetype="application/json")

    auth_user_uid = req.user["uid"]
    user_profile = get_user_data_from_firestore(auth_user_uid)

    if not user_profile:
        # This should ideally not happen if require_auth is used and user exists in Auth but not Firestore
        # Or if get_user_data_from_firestore failed for other reasons
        return https_fn.Response(status=404, response=json.dumps({"success": False, "error": {"code": "USER_PROFILE_NOT_FOUND", "message": "User profile not found."}}), mimetype="application/json")

    if user_profile.get("householdId"):
        return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "ALREADY_IN_HOUSEHOLD", "message": "User already belongs to a household."}}), mimetype="application/json")

    try:
        data = req.get_json()
        if not data or not data.get("name"):
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "MISSING_HOUSEHOLD_NAME", "message": "Household name is required."}}), mimetype="application/json")

        household_name = data["name"].strip()
        if not household_name:
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "INVALID_HOUSEHOLD_NAME", "message": "Household name cannot be empty."}}), mimetype="application/json")

        # Create household document
        household_data = {
            "name": household_name,
            "ownerUserId": auth_user_uid,
            "memberUserIds": [auth_user_uid],
            "created": firestore.SERVER_TIMESTAMP
        }
        db = get_db()
        # Firestore batch for atomic operation
        batch = db.batch()

        new_household_ref = db.collection("households").document()
        batch.set(new_household_ref, household_data)

        # Update user's householdId
        user_ref = db.collection("users").document(auth_user_uid)
        batch.update(user_ref, {"householdId": new_household_ref.id})

        batch.commit()

        # Fetch the created household to return its data (including server-generated timestamp)
        created_household_doc = new_household_ref.get()
        response_data = created_household_doc.to_dict()
        response_data["id"] = created_household_doc.id
        if 'created' in response_data and hasattr(response_data['created'], 'isoformat'):
            response_data['created'] = response_data['created'].isoformat()

        return https_fn.Response(status=201, response=json.dumps({"success": True, "data": response_data, "error": None}), mimetype="application/json")

    except Exception as e:
        # Log the exception for debugging
        # print(f"Error creating household: {e}")
        return https_fn.Response(status=500, response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}}), mimetype="application/json")


# --- Room Management Logic ---
def _create_room_logic(req: https_fn.Request, household_id: str) -> https_fn.Response:
    """Creates a new room in a household."""
    if req.method != "POST":
        return https_fn.Response(status=405, response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}), mimetype="application/json")

    try:
        data = req.get_json()
        name = data.get("name")
        n_bins = data.get("nBins")

        if not name or not isinstance(n_bins, int):
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "MISSING_FIELDS", "message": "'name' (string) and 'nBins' (integer) are required."}}), mimetype="application/json")

        auth_user_uid = req.user["uid"]
        user_profile = get_user_data_from_firestore(auth_user_uid)

        if not user_profile or user_profile.get("householdId") != household_id:
            return https_fn.Response(status=403, response=json.dumps({"success": False, "error": {"code": "FORBIDDEN", "message": "User cannot create a room in this household."}}), mimetype="application/json")

        room_data = {
            "name": name,
            "nBins": n_bins,
        }
        db = get_db()
        _, room_ref = db.collection("households").document(household_id).collection("rooms").add(room_data)
        
        created_room_doc = room_ref.get()
        response_data = created_room_doc.to_dict()
        response_data["id"] = created_room_doc.id

        return https_fn.Response(status=201, response=json.dumps({"success": True, "data": response_data, "error": None}), mimetype="application/json")

    except Exception as e:
        return https_fn.Response(status=500, response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}}), mimetype="application/json")

def _get_rooms_logic(req: https_fn.Request, household_id: str) -> https_fn.Response:
    """Lists all rooms in a household."""
    if req.method != "GET":
        return https_fn.Response(status=405, response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}), mimetype="application/json")

    try:
        auth_user_uid = req.user["uid"]
        user_profile = get_user_data_from_firestore(auth_user_uid)

        if not user_profile or user_profile.get("householdId") != household_id:
            return https_fn.Response(status=403, response=json.dumps({"success": False, "error": {"code": "FORBIDDEN", "message": "User cannot list rooms for this household."}}), mimetype="application/json")
        db = get_db()
        rooms_query = db.collection("households").document(household_id).collection("rooms").stream()
        rooms_list = []
        for room in rooms_query:
            room_data = room.to_dict()
            room_data["id"] = room.id
            rooms_list.append(room_data)

        return https_fn.Response(status=200, response=json.dumps({"success": True, "data": rooms_list, "error": None}), mimetype="application/json")

    except Exception as e:
        return https_fn.Response(status=500, response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}}), mimetype="application/json")

def _get_room_logic(req: https_fn.Request, household_id: str, room_id: str) -> https_fn.Response:
    """Gets a specific room in a household."""
    if req.method != "GET":
        return https_fn.Response(status=405, response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}), mimetype="application/json")

    try:
        auth_user_uid = req.user["uid"]
        user_profile = get_user_data_from_firestore(auth_user_uid)

        if not user_profile or user_profile.get("householdId") != household_id:
            return https_fn.Response(status=403, response=json.dumps({"success": False, "error": {"code": "FORBIDDEN", "message": "User cannot access this room."}}), mimetype="application/json")

        db = get_db()
        room_ref = db.collection("households").document(household_id).collection("rooms").document(room_id)
        room_doc = room_ref.get()

        if not room_doc.exists:
            return https_fn.Response(status=404, response=json.dumps({"success": False, "error": {"code": "ROOM_NOT_FOUND", "message": "Room not found."}}), mimetype="application/json")

        response_data = room_doc.to_dict()
        response_data["id"] = room_doc.id

        return https_fn.Response(status=200, response=json.dumps({"success": True, "data": response_data, "error": None}), mimetype="application/json")

    except Exception as e:
        return https_fn.Response(status=500, response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}}), mimetype="application/json")

def _update_room_logic(req: https_fn.Request, household_id: str, room_id: str) -> https_fn.Response:
    """Updates a room in a household."""
    if req.method != "PUT":
        return https_fn.Response(status=405, response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}), mimetype="application/json")

    try:
        data = req.get_json()
        update_payload = {}
        if "name" in data:
            update_payload["name"] = data["name"]
        if "nBins" in data:
            if not isinstance(data["nBins"], int):
                return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "INVALID_NBINS", "message": "'nBins' must be an integer."}}), mimetype="application/json")
            update_payload["nBins"] = data["nBins"]

        if not update_payload:
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "NO_UPDATE_FIELDS", "message": "No valid fields provided for update."}}), mimetype="application/json")

        auth_user_uid = req.user["uid"]
        user_profile = get_user_data_from_firestore(auth_user_uid)

        if not user_profile or user_profile.get("householdId") != household_id:
            return https_fn.Response(status=403, response=json.dumps({"success": False, "error": {"code": "FORBIDDEN", "message": "User cannot update this room."}}), mimetype="application/json")

        db = get_db()
        room_ref = db.collection("households").document(household_id).collection("rooms").document(room_id)
        room_ref.update(update_payload)

        updated_room_doc = room_ref.get()
        response_data = updated_room_doc.to_dict()
        response_data["id"] = updated_room_doc.id

        return https_fn.Response(status=200, response=json.dumps({"success": True, "data": response_data, "error": None}), mimetype="application/json")

    except Exception as e:
        return https_fn.Response(status=500, response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}}), mimetype="application/json")

def _delete_room_logic(req: https_fn.Request, household_id: str, room_id: str) -> https_fn.Response:
    """Deletes a room and all items within it from a household."""
    if req.method != "DELETE":
        return https_fn.Response(status=405, response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}), mimetype="application/json")

    try:
        auth_user_uid = req.user["uid"]
        user_profile = get_user_data_from_firestore(auth_user_uid)

        if not user_profile or user_profile.get("householdId") != household_id:
            return https_fn.Response(status=403, response=json.dumps({"success": False, "error": {"code": "FORBIDDEN", "message": "User cannot delete this room."}}), mimetype="application/json")

        db = get_db()
        # Start a batch write
        batch = db.batch()

        # 1. Find all items in the room to be deleted
        items_to_delete_query = db.collection("items").where("location.roomId", "==", room_id).where("householdId", "==", household_id)
        items_to_delete_docs = items_to_delete_query.stream()

        # 2. Add delete operations for each item to the batch
        for doc in items_to_delete_docs:
            batch.delete(doc.reference)

        # 3. Add the delete operation for the room itself to the batch
        room_ref = db.collection("households").document(household_id).collection("rooms").document(room_id)
        batch.delete(room_ref)

        # 4. Commit the batch
        batch.commit()

        return https_fn.Response(status=200, response=json.dumps({"success": True, "data": {"message": f"Room {room_id} and all its items deleted successfully."}, "error": None}), mimetype="application/json")

    except Exception as e:
        return https_fn.Response(status=500, response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}}), mimetype="application/json")


def _bulk_import_items_logic(req: https_fn.Request) -> https_fn.Response:
    """Bulk imports items from a CSV file.

    Requires Authentication.
    The file is expected to be in multipart/form-data format.
    """
    if req.method != "POST":
        return https_fn.Response(status=405, response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}), mimetype="application/json")

    try:
        if 'file' not in req.files:
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "MISSING_FILE", "message": "No file part in the request."}}), mimetype="application/json")

        file = req.files['file']
        if file.filename == '':
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "NO_FILE_SELECTED", "message": "No file selected."}}), mimetype="application/json")

        auth_user_uid = req.user["uid"]
        user_profile = get_user_data_from_firestore(auth_user_uid)

        if not user_profile or not user_profile.get("householdId"):
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "USER_NOT_IN_HOUSEHOLD", "message": "User must belong to a household to import items."}}), mimetype="application/json")

        household_id = user_profile["householdId"]

        # Decode the file content as text
        csv_file = io.StringIO(file.read().decode('utf-8'))
        reader = csv.DictReader(csv_file)

        db = get_db()
        # Pre-fetch household rooms to avoid multiple reads inside the loop
        rooms_ref = db.collection("households").document(household_id).collection("rooms").stream()
        rooms_map = {room.to_dict()["name"]: {"id": room.id, "nBins": room.to_dict()["nBins"]} for room in rooms_ref}

        items_to_create = []
        for row in reader:
            name = row.get('name')
            room_name = row.get('roomName')
            bin_number_str = row.get('binNumber')

            if not name or not room_name or not bin_number_str:
                # Skip rows with missing required fields
                continue
            
            if room_name not in rooms_map:
                # Or handle as an error for the whole batch
                continue

            try:
                bin_number = int(bin_number_str)
                if bin_number <= 0 or bin_number > rooms_map[room_name]["nBins"]:
                    continue
            except ValueError:
                continue

            location = {
                "roomId": rooms_map[room_name]["id"],
                "binNumber": bin_number
            }

            item_data = {
                "name": name,
                "location": location,
                "status": row.get('status', 'STORED').upper(),
                "isPrivate": row.get('isPrivate', 'false').lower() == 'true',
                "metadata": {
                    "category": row.get('category', ''),
                    "notes": row.get('notes', '')
                },
                "creatorUserId": auth_user_uid,
                "householdId": household_id,
                "lastUpdated": firestore.SERVER_TIMESTAMP
            }
            items_to_create.append(item_data)

        if not items_to_create:
            return https_fn.Response(status=400, response=json.dumps({"success": False, "error": {"code": "NO_VALID_ITEMS", "message": "No valid items found in the CSV file."}}), mimetype="application/json")

        batch = db.batch()
        for item_data in items_to_create:
            item_ref = db.collection("items").document()
            batch.set(item_ref, item_data)
        batch.commit()

        return https_fn.Response(status=200, response=json.dumps({"success": True, "data": {"count": len(items_to_create)}, "error": None}), mimetype="application/json")

    except Exception as e:
        return https_fn.Response(status=500, response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}}), mimetype="application/json")

def _create_user_logic(req: https_fn.Request) -> https_fn.Response:
    if req.method != "POST":
        return https_fn.Response(
            status=405,
            response=json.dumps({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}}),
            mimetype="application/json"
        )

    try:
        data = req.get_json()
        uid = data.get("uid")
        email = data.get("email")
        display_name = data.get("displayName")

        if not uid or not email:
            return https_fn.Response(
                status=400,
                response=json.dumps({"success": False, "error": {"code": "MISSING_FIELDS", "message": "UID and email are required."}}),
                mimetype="application/json"
            )

        db = get_db()
        user_ref = db.collection("users").document(uid)

        # Check if user already exists
        if user_ref.get().exists:
            return https_fn.Response(
                status=200,
                response=json.dumps({"success": True, "data": {"message": "User already exists."}}),
                mimetype="application/json"
            )

        user_data = {
            "email": email,
            "displayName": display_name if display_name else email,
            "householdId": None,
            "created": firestore.SERVER_TIMESTAMP,
            "lastLogin": firestore.SERVER_TIMESTAMP
        }

        user_ref.set(user_data)

        response_dict = {
            "success": True,
            "data": {"uid": uid, "email": email},
            "error": None
        }
        return https_fn.Response(
            status=201,
            response=json.dumps(response_dict),
            mimetype="application/json"
        )

    except Exception as e:
        return https_fn.Response(
            status=500,
            response=json.dumps({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}}),
            mimetype="application/json"
        )

# --- API Router Function ---
@https_fn.on_request(max_instances=10, memory=options.MemoryOption.MB_256, cors=options.CorsOptions(cors_origins="*", cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])) # Added default options, can be adjusted
def api(req: https_fn.Request) -> https_fn.Response:
    """Main API router function.
    Inspects req.path and req.method to route to the appropriate logic function.
    """
    # Normalize path to ensure consistent matching (e.g., remove trailing slash if any)
    # Firebase Functions req.path typically starts with '/', e.g., '/register' or '/items/some_id'
    # The rewrite rule in firebase.json will be {"source": "/api/**", "function": "api"}
    # So, req.path inside the function will be like '/api/register', '/api/items', '/api/items/123'
    # For functions deployed directly, the path is simply '/', unless a base path is part of the trigger.
    # Assuming the firebase.json rewrite, req.path will NOT include '/api'. ADDED BY USER: AT LEAST IN LOCAL TESTING, IT DOES INCLUDE '/api', IMOPRTANT DO NOT REMOVE

    normalized_path = req.path.rstrip("/") # Remove trailing slash for consistency

    if normalized_path == "/api/register" and req.method == "POST":
        return _register_logic(req)

    if normalized_path == "/api/reset_password" and req.method == "POST":
        return _reset_password_logic(req)

    if normalized_path == "/api/households" and req.method == "POST":
        return require_auth(_create_household_logic)(req)

    if normalized_path == "/api/items" and req.method == "POST":
        return require_auth(_create_item_logic)(req)

    if normalized_path == "/api/items" and req.method == "GET":
        return require_auth(_get_items_logic)(req)

    if normalized_path == "/api/items/bulk" and req.method == "POST":
        return require_auth(_bulk_import_items_logic)(req)

    if normalized_path == "/api/profile" and req.method == "GET":
        return require_auth(_get_profile_logic)(req)

    # Handle /households/{householdId}/rooms and /households/{householdId}/rooms/{roomId}
    if normalized_path.startswith("/api/households/"):
        path_parts = normalized_path.split("/")
        # /api/households/{hid}/rooms/{rid} -> ['', 'api', 'households', hid, 'rooms', rid] -> len=6
        if len(path_parts) == 6 and path_parts[4] == "rooms":
            household_id = path_parts[3]
            room_id = path_parts[5]
            if req.method == "GET":
                return require_auth(_get_room_logic)(req, household_id=household_id, room_id=room_id)
            elif req.method == "PUT":
                return require_auth(_update_room_logic)(req, household_id=household_id, room_id=room_id)
            elif req.method == "DELETE":
                return require_auth(_delete_room_logic)(req, household_id=household_id, room_id=room_id)
        # /api/households/{hid}/rooms -> ['', 'api', 'households', hid, 'rooms'] -> len=5
        elif len(path_parts) == 5 and path_parts[4] == "rooms":
            household_id = path_parts[3]
            if req.method == "POST":
                return require_auth(_create_room_logic)(req, household_id=household_id)
            elif req.method == "GET":
                return require_auth(_get_rooms_logic)(req, household_id=household_id)

    # Handle /items/{item_id} type paths
    if normalized_path.startswith("/api/items/"):
        path_parts = normalized_path.split("/") # e.g., ['', 'api', 'items', 'item_id'] for "/api/items/item_id"
        if len(path_parts) == 4:
            actual_item_id = path_parts[3]
            if req.method == "GET":
                return require_auth(_get_item_logic)(req, actual_item_id=actual_item_id)
            elif req.method == "PUT":
                return require_auth(_update_item_logic)(req, actual_item_id=actual_item_id)
            elif req.method == "DELETE":
                return require_auth(_delete_item_logic)(req, actual_item_id=actual_item_id)

    if normalized_path == "/api/users" and req.method == "POST":
        return _create_user_logic(req)

    # If no routes matched, return 404 Not Found
    return https_fn.Response(
        status=404,
        response=json.dumps({"success": False, "error": {"code": "NOT_FOUND", "message": f"The requested path {req.path} with method {req.method} was not found."}}),
        mimetype="application/json"
    )

@https_fn.on_request()
def test_ping(req: https_fn.Request) -> https_fn.Response:
    """A simple test endpoint that returns a JSON response."""
    return https_fn.Response(response=json.dumps({"message": "pong"}), status=200, headers={"Content-Type": "application/json"})

