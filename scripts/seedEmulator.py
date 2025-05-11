import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os
import sys

# IMPORTANT: This script is designed to work with the Firebase Emulator Suite.
# Ensure your FIRESTORE_EMULATOR_HOST environment variable is set before running.
# Example: export FIRESTORE_EMULATOR_HOST="localhost:8080" (for Linux/macOS)
#          set FIRESTORE_EMULATOR_HOST=localhost:8080 (for Windows CMD)
#          $env:FIRESTORE_EMULATOR_HOST="localhost:8080" (for Windows PowerShell)

if not os.environ.get('FIRESTORE_EMULATOR_HOST'):
    print("FIRESTORE_EMULATOR_HOST environment variable not set. Exiting.", file=sys.stderr)
    print("Please set it to your Firestore emulator host and port, e.g., localhost:8080", file=sys.stderr)
    sys.exit(1)

try:
    # The FIRESTORE_EMULATOR_HOST environment variable is used by the SDK
    # to connect to the emulator.
    # For emulator, explicitly pass a dummy project_id and None credentials
    # if FIRESTORE_EMULATOR_HOST is set. This can make it more robust.
    # You can use your actual Firebase project ID or any string like 'emulator-project'.
    cred = None # No credentials needed for emulator if FIRESTORE_EMULATOR_HOST is set
    # Replace 'home-storage-emulator' with your actual Firebase project ID if preferred, though a dummy ID works for the emulator.
    options = {'projectId': 'home-storage-management-system'}

    if not firebase_admin._apps: # Check if the default app is not initialized
        firebase_admin.initialize_app(credential=cred, options=options)
    else:
        print("Firebase app already initialized. Using existing app.", file=sys.stderr)
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}", file=sys.stderr)
    sys.exit(1)

db = firestore.client()

def seed_database():
    print('Starting database seed for Firestore emulator...')

    # --- Households ---
    household1_id = 'household-alpha'
    household2_id = 'household-beta'

    households_data = [
        {
            '_id': household1_id,
            'name': 'The Alpha Family',
            'ownerUserId': 'user-alice-uid',
            'memberUserIds': ['user-alice-uid', 'user-bob-uid'],
            'created': firestore.SERVER_TIMESTAMP
        },
        {
            '_id': household2_id,
            'name': 'The Beta Crew',
            'ownerUserId': 'user-charlie-uid',
            'memberUserIds': ['user-charlie-uid'],
            'created': firestore.SERVER_TIMESTAMP
        }
    ]

    for household in households_data:
        try:
            doc_ref = db.collection('households').document(household['_id'])
            doc_ref.set({
                'name': household['name'],
                'ownerUserId': household['ownerUserId'],
                'memberUserIds': household['memberUserIds'],
                'created': household['created']
            })
            print(f"Upserted household: {household['_id']}")
        except Exception as e:
            print(f"Error upserting household {household['_id']}: {e}", file=sys.stderr)

    # --- Users ---
    users_data = [
        {
            '_id': 'user-alice-uid',
            'email': 'alice@example.com',
            'displayName': 'Alice Alpha',
            'householdId': household1_id,
            'created': firestore.SERVER_TIMESTAMP,
            'lastLogin': firestore.SERVER_TIMESTAMP
        },
        {
            '_id': 'user-bob-uid',
            'email': 'bob@example.com',
            'displayName': 'Bob Alpha',
            'householdId': household1_id,
            'created': firestore.SERVER_TIMESTAMP,
            'lastLogin': firestore.SERVER_TIMESTAMP
        },
        {
            '_id': 'user-charlie-uid',
            'email': 'charlie@example.com',
            'displayName': 'Charlie Beta',
            'householdId': household2_id,
            'created': firestore.SERVER_TIMESTAMP,
            'lastLogin': firestore.SERVER_TIMESTAMP
        }
    ]

    for user in users_data:
        try:
            doc_ref = db.collection('users').document(user['_id'])
            doc_ref.set({
                'email': user['email'],
                'displayName': user['displayName'],
                'householdId': user['householdId'],
                'created': user['created'],
                'lastLogin': user['lastLogin']
            })
            print(f"Upserted user: {user['_id']} ({user['displayName']})")
        except Exception as e:
            print(f"Error upserting user {user['_id']}: {e}", file=sys.stderr)

    # --- Items ---
    items_data = [
        {
            '_id': 'item-laptop-alice',
            'name': "Alice's Work Laptop",
            'location': "A1",
            'status': "STORED",
            'creatorUserId': "user-alice-uid",
            'householdId': household1_id,
            'isPrivate': True,
            'lastUpdated': firestore.SERVER_TIMESTAMP,
            'metadata': {'category': "Electronics", 'notes': "Company issued Dell XPS"}
        },
        {
            '_id': 'item-toolbox-shared',
            'name': "Household Toolbox",
            'location': "B2",
            'status': "STORED",
            'creatorUserId': "user-bob-uid",
            'householdId': household1_id,
            'isPrivate': False,
            'lastUpdated': firestore.SERVER_TIMESTAMP,
            'metadata': {'category': "Tools", 'notes': "Red toolbox, basic tools"}
        },
        {
            '_id': 'item-gaming-console-charlie',
            'name': "Charlie's Gaming Console",
            'location': "C3",
            'status': "STORED",
            'creatorUserId': "user-charlie-uid",
            'householdId': household2_id,
            'isPrivate': False,
            'lastUpdated': firestore.SERVER_TIMESTAMP,
            'metadata': {'category': "Entertainment", 'notes': "Plays all the cool games"}
        },
        {
            '_id': 'item-boardgames-shared',
            'name': "Family Board Games",
            'location': "D4",
            'status': "STORED",
            'creatorUserId': "user-alice-uid",
            'householdId': household1_id,
            'isPrivate': False,
            'lastUpdated': firestore.SERVER_TIMESTAMP,
            'metadata': {'category': "Entertainment", 'notes': "Stack of various board games"}
        }
    ]

    for item in items_data:
        try:
            doc_ref = db.collection('items').document(item['_id'])
            doc_ref.set({
                'name': item['name'],
                'location': item['location'],
                'status': item['status'],
                'creatorUserId': item['creatorUserId'],
                'householdId': item['householdId'],
                'isPrivate': item['isPrivate'],
                'lastUpdated': item['lastUpdated'],
                'metadata': item['metadata']
            })
            print(f"Upserted item: {item['_id']} ({item['name']})")
        except Exception as e:
            print(f"Error upserting item {item['_id']}: {e}", file=sys.stderr)

    print('Database seed complete!')

if __name__ == '__main__':
    try:
        seed_database()
    except Exception as e:
        print(f"Error seeding database: {e}", file=sys.stderr)
        sys.exit(1)