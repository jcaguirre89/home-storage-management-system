# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

from firebase_functions import https_fn
from firebase_admin import credentials, auth, firestore
import firebase_admin
from flask import jsonify, request

# Initialize Firebase Admin SDK
# Make sure to replace 'path/to/your/serviceAccountKey.json' with the actual path to your service account key
# or ensure your environment is configured for Firebase Admin SDK auto-initialization if deploying.
try:
    # Attempt to initialize with a service account key (for local development)
    # Ensure 'GOOGLE_APPLICATION_CREDENTIALS' environment variable is set,
    # or the service account key file is present.
    # For deployed functions, this initialization might not be needed if the runtime provides it.
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred)
except Exception as e:
    # Fallback if default credentials are not found (e.g., for some local setups without env var)
    # This is a common pattern but ensure your specific setup is covered.
    # If this is running in a Firebase environment, it might initialize without parameters.
    if not firebase_admin._apps: # Check if already initialized
        firebase_admin.initialize_app()


db = firestore.client()

@https_fn.on_request()
def register(req: https_fn.Request) -> https_fn.Response:
    """
    Registers a new user with email and password,
    and creates a corresponding user document in Firestore.
    householdId is now optional.
    """
    if req.method != "POST":
        return https_fn.Response(
            status=405,
            response=jsonify({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}})
        )

    try:
        data = req.get_json()
        email = data.get("email")
        password = data.get("password")
        display_name = data.get("displayName", "No Name") # Optional display name
        household_id = data.get("householdId") # Now optional

        if not email or not password:
            return https_fn.Response(
                status=400,
                response=jsonify({"success": False, "error": {"code": "MISSING_FIELDS", "message": "Email and password are required."}})
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

        # Create user document in Firestore
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

        db.collection("users").document(user_record.uid).set(user_data)

        # For security, don't return password or full user_record unless necessary.
        # The tech design doc does not specify returning a JWT on register, only on login.
        return https_fn.Response(
            status=201,
            response=jsonify({
                "success": True,
                "data": {"uid": user_record.uid, "email": user_record.email},
                "error": None
            })
        )

    except auth.EmailAlreadyExistsError:
        return https_fn.Response(
            status=400,
            response=jsonify({"success": False, "error": {"code": "EMAIL_ALREADY_EXISTS", "message": "The email address is already in use by another account."}})
        )
    except Exception as e:
        # Log the exception for debugging
        print(f"Error during registration: {e}")
        return https_fn.Response(
            status=500,
            response=jsonify({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}})
        )

@https_fn.on_request()
def reset_password(req: https_fn.Request) -> https_fn.Response:
    """
    Initiates the password reset process for a given email.
    Firebase Auth will send a password reset email to the user.
    Returns a generic success message regardless of user existence for security.
    """
    if req.method != "POST":
        return https_fn.Response(
            status=405,
            response=jsonify({"success": False, "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method not allowed"}})
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
                response=jsonify({"success": False, "error": {"code": "MISSING_EMAIL", "message": "Email is required in the JSON payload."}})
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
            response=jsonify({
                "success": True,
                "data": {"message": "If an account exists for this email, a password reset link has been sent."},
                "error": None
            })
        )
    except Exception as e:
        # Log the actual error on the server side for debugging
        print(f"Error during password reset: {e}")
        # Optionally, log more request details if helpful, e.g., req.headers
        # Be cautious about logging sensitive parts of req.data in production logs.

        # Return a generic 500 error to the client
        return https_fn.Response(
            status=500,
            response=jsonify({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred while processing your request."}})
        )


# You would then need to wire this up in your firebase.json or similar
# to map the /auth/register path to this function.
# For example, in firebase.json:
# {
#   "functions": {
#     "source": "functions"
#   },
#   "hosting": {
#     "public": "frontend/public", // Or your public folder
#     "ignore": [
#       "firebase.json",
#       "**/.*",
#       "**/node_modules/**"
#     ],
#     "rewrites": [
#       {
#         "source": "/auth/register",
#         "function": "register" // This 'register' should match the function name exported or deployed
#       }
#       // ... other rewrites for login, resetPassword etc.
#     ]
#   }
# }