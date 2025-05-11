# Home Storage System - Technical Design Document

## 1. Overview

This document describes the technical architecture for a smart home storage tracking system. The system allows a user to track the location and status of items stored in a physical grid of storage totes using voice commands via Google Assistant, with a supplementary web interface.

### 1.1 Core Functionality

- Track item storage location in a grid (rows A-D, columns 1-4)
- Voice command interface through Google Assistant
- Web interface for direct manipulation and bulk imports
- Status tracking for items (stored vs. removed)

### 1.2 User Interaction Flows

1. **Adding items**: "OK Google, I put the microphone stand in A2"
2. **Finding items**: "OK Google, where is the microphone stand?"
3. **Removing items**: "OK Google, I'm taking the microphone stand"
4. **Web interface**: Manual CRUD operations and CSV import

## 2. System Architecture

### 2.1 Component Overview

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Google Home  │◄───►│   Dialogflow  │◄───►│ Firebase      │
│  Assistant    │     │   Agent       │     │ Functions     │
└───────────────┘     └───────────────┘     └───────┬───────┘
                                                   │
                                                   ▼
┌───────────────┐                          ┌───────────────┐
│  Svelte Web   │◄─────────────────────────┤   Firestore   │
│  Application  │                          │   Database    │
└───────────────┘                          └───────────────┘
```

### 2.2 Core Components

- **Google Assistant**: Entry point for voice commands
- **Dialogflow**: Natural language processing to interpret commands
- **Firebase Functions**: Backend logic and API endpoints
- **Firestore**: NoSQL database for item storage
- **Svelte Web App**: User interface for direct interaction

## 3. Data Model

### 3.1 Firestore Collections

#### Items Collection
```json
{
  "items": {
    "{itemId}": {
      "name": "Microphone Stand",
      "location": "A2",
      "status": "STORED",
      "creatorUserId": "firebase_auth_uid_of_user_who_added_item",
      "householdId": "household_id_this_item_belongs_to",
      "isPrivate": false,
      "lastUpdated": "2025-05-10T15:30:00Z",
      "metadata": {
        "category": "Music Equipment",
        "notes": "Black stand with boom arm"
      }
    }
  }
}
```

#### Users Collection
```json
{
  "users": {
    "{userId}": {
      "email": "user@example.com",
      "householdId": "household_id_the_user_belongs_to",
      "displayName": "User's Display Name",
      "created": "2025-05-08T12:00:00Z",
      "lastLogin": "2025-05-10T15:00:00Z"
    }
  }
}
```

#### Households Collection
```json
{
  "households": {
    "{householdId}": {
      "name": "The Example Household",
      "ownerUserId": "firebase_auth_uid_of_household_owner",
      "memberUserIds": [
        "firebase_auth_uid_member1",
        "firebase_auth_uid_member2"
      ],
      "created": "2025-05-07T10:00:00Z"
    }
  }
}
```

### 3.2 Item States

- **STORED**: The item is currently in a tote at the specified location
- **OUT**: The item has been removed from storage

## 4. API Design

### 4.1 Firebase Functions Endpoints

#### Authentication
- `POST /auth/register` - Create new user account
- `POST /auth/resetPassword` - Password reset flow

#### Items Management
- `GET /items` - List all items (with optional filters)
- `GET /items/{itemId}` - Get a specific item
- `POST /items` - Create a new item
- `PUT /items/{itemId}` - Update an item
- `DELETE /items/{itemId}` - Delete an item
- `POST /items/bulk` - Bulk import items via CSV

#### Dialogflow Webhook
- `POST /dialogflow-webhook` - Entry point for Dialogflow fulfillment

### 4.2 Response Format

All API responses will follow this JSON structure:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

For errors:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "The requested item could not be found"
  }
}
```

## 5. Dialogflow Configuration

### 5.1 Intents

#### StoreItem Intent
- **Training phrases**:
  - "I put the [item] in [location]"
  - "I stored the [item] in [location]"
  - "The [item] goes in [location]"

- **Parameters**:
  - `item` (required): The name of the item being stored
  - `location` (required): The storage location (A1-D4)

#### FindItem Intent
- **Training phrases**:
  - "Where is the [item]?"
  - "Find my [item]"
  - "Locate the [item]"

- **Parameters**:
  - `item` (required): The name of the item to locate

#### RemoveItem Intent
- **Training phrases**:
  - "I'm taking the [item]"
  - "I removed the [item]"
  - "Taking out the [item]"

- **Parameters**:
  - `item` (required): The name of the item being removed

### 5.2 Entities

#### `@ItemName` (List Type)
- Map for common item names based on initial usage
- Automatically expanded as new items are added

#### `@Location` (Composite Entity)
- Pattern: [A-D][1-4]
- Examples: A1, B3, C4, D2

## 6. Frontend Architecture

### 6.1 Svelte App Structure

```
src/
├── components/
│   ├── Auth/
│   │   ├── LoginForm.svelte
│   │   └── RegisterForm.svelte
│   ├── Items/
│   │   ├── ItemList.svelte
│   │   ├── ItemForm.svelte
│   │   ├── ItemCard.svelte
│   │   └── BulkImport.svelte
│   ├── Household/
│   │   ├── HouseholdSetup.svelte
│   │   ├── HouseholdMembers.svelte
│   │   └── HouseholdSettings.svelte
│   └── Layout/
│       ├── Header.svelte
│       ├── Footer.svelte
│       └── Navigation.svelte
├── routes/
│   ├── index.svelte
│   ├── login.svelte
│   ├── register.svelte
│   ├── dashboard.svelte
│   ├── items/
│   │   ├── index.svelte
│   │   └── [id].svelte
│   └── household/
│       ├── index.svelte
│       └── setup.svelte
├── stores/
│   ├── auth.js
│   ├── items.js
│   └── household.js
├── services/
│   ├── api.js
│   └── firebase.js
└── App.svelte
```

### 6.2 UI Components

#### Dashboard View
- Storage grid visualization (A1-D4)
- Item count by location (for items visible to the user within their household)
- Recently added/removed items (household-specific)
- Quick search field (searches within accessible household items)

#### Items Management View
- Sortable/filterable table of all items accessible to the user (respecting household and `isPrivate` flag)
- Status indicators (stored/out)
- Visual indicator for `isPrivate` items
- Edit/Delete actions (conditional based on ownership/permissions)
- Add new item form:
    - Includes a toggle or checkbox for `isPrivate`
    - `householdId` and `creatorUserId` are set automatically based on the logged-in user
- Bulk import button (imported items will be associated with the user's current household and can have a default `isPrivate` status or a column in CSV)

#### Item Detail View
- Item information, including its `isPrivate` status
- Location history
- Metadata editor
- Storage status toggle
- Edit/Delete controls are conditional based on user's permissions (creator of private item, or member of household for public items)

#### User Profile/Settings View (Implied - to be added if not already planned)
- Manage user display name
- View current `householdId`
- Option to leave household (might require backend logic for cleanup or ownership transfer if owner)

#### Household Management View (New Section)
- **Household Setup/Join Page (`routes/household/setup.svelte`):**
    - Prompts new users (or users not yet in a household) to create a new household or enter an invite code/ID to join an existing one
- **Main Household Page (`routes/household/index.svelte`):
    - `HouseholdSettings.svelte` component:
        - Allows household owner to change household name
        - Displays household ID (potentially for inviting others)
    - `HouseholdMembers.svelte` component:
        - Lists members of the current household
        - If user is owner, allows removing members (requires backend logic)
        - If user is owner, potentially an option to generate invite codes/links (requires backend logic)

## 7. Security Implementation

### 7.1 Authentication Flow

1. User enters email/password on the client-side login screen (web or mobile app).
2. The client application uses the Firebase Authentication SDK (e.g., `signInWithEmailAndPassword` for JavaScript) to send credentials directly to Firebase Auth service.
3. Firebase validates credentials and returns a JWT (ID Token) and a Refresh Token directly to the client.
4. The client securely stores the JWT (e.g., in memory, or using Firebase SDK's persistence options). For web, `localStorage` or `sessionStorage` can be used, but SDK persistence is often preferred.
5. The JWT (ID Token) is included in the Authorization header (e.g., `Bearer <ID_TOKEN>`) for all API requests to your backend Firebase Functions that require authentication.

### 7.2 Authorization Rules

Firestore security rules will be updated to support household-level access and private items. The core logic will be:

- Users must be authenticated to access any data.
- Users can manage their own user document in the `users` collection.
- For items in the `items` collection:
    - If an item has `isPrivate` set to `true`, only the `creatorUserId` of that item can read, update, or delete it.
    - If an item has `isPrivate` set to `false`, any user belonging to the same `householdId` as the item can read, update, or delete it.
    - When creating an item, the `creatorUserId` will be the authenticated user's UID, and the `householdId` will be copied from the user's profile.
- The `households` collection might have rules allowing members to read their household document, and owners/admins to manage it.

A more detailed ruleset will be implemented in `firestore.rules`.

**Google Assistant and Service Account Access:**
Interactions via Google Assistant are processed by Firebase Functions, which utilize a Firebase service account. This service account has elevated privileges and is not subject to the same `request.auth.uid`-based security rules that apply to end-users interacting via the web UI. The Firebase Functions themselves will contain the logic to determine data access and modification rights for voice commands, effectively acting as a trusted backend service.

Firestore security rules:

```
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to get user's data (including householdId)
    function getUserData(userId) {
      return get(/databases/$(database)/documents/users/$(userId)).data;
    }

    // Default: Deny all access unless explicitly allowed.
    // Users must be authenticated for any operation.
    match /{document=**} {
      allow read, write: if request.auth != null;
    }

    // Users collection:
    match /users/{userId} {
      allow read, update: if request.auth.uid == userId;
      // Allow user to create their own profile. householdId is optional.
      allow create: if request.auth.uid == userId &&
                       (request.resource.data.householdId == null || request.resource.data.householdId is string);
    }

    // Items collection:
    match /items/{itemId} {
      allow read: if request.auth != null &&
                       (resource.data.isPrivate == true && request.auth.uid == resource.data.creatorUserId) ||
                       (resource.data.isPrivate == false && getUserData(request.auth.uid).householdId == resource.data.householdId);

      allow create: if request.auth != null &&
                       request.resource.data.creatorUserId == request.auth.uid &&
                       request.resource.data.householdId == getUserData(request.auth.uid).householdId &&
                       request.resource.data.isPrivate is bool; // Ensure isPrivate is explicitly set

      allow update: if request.auth != null &&
                       // Check ownership/household membership
                       ((resource.data.isPrivate == true && request.auth.uid == resource.data.creatorUserId) ||
                        (resource.data.isPrivate == false && getUserData(request.auth.uid).householdId == resource.data.householdId)) &&
                       // Prevent changing critical fields like creator or household on update
                       request.resource.data.creatorUserId == resource.data.creatorUserId &&
                       request.resource.data.householdId == resource.data.householdId;

      allow delete: if request.auth != null &&
                       (resource.data.isPrivate == true && request.auth.uid == resource.data.creatorUserId) ||
                       (resource.data.isPrivate == false && getUserData(request.auth.uid).householdId == resource.data.householdId);
    }

    // Households collection (example rules):
    // match /households/{householdId} {
    //   // Allow members to read their household document
    //   allow read: if request.auth != null && getUserData(request.auth.uid).householdId == householdId;
    //   // Allow owner to update (e.g., add/remove members from memberUserIds array)
    //   allow write: if request.auth != null && request.auth.uid == resource.data.ownerUserId;
    // }
  }
}
```

## 8. Deployment Strategy

### 8.1 Firebase Setup

1. Create new Firebase project
2. Enable Firestore database
3. Configure Firebase Authentication (email/password)
4. Deploy Firebase Functions for API
5. Set up Firebase Hosting for web app (optional)

### 8.2 Dialogflow Deployment

1. Create new Dialogflow agent
2. Configure intents and entities
3. Link to Google Assistant
4. Set fulfillment webhook to Firebase Function endpoint

### 8.3 Web App Deployment

Option 1: Firebase Hosting
- Integrated with other Firebase services
- Free tier includes hosting with custom domain

Option 2: Vercel/Netlify
- Simple GitHub integration
- Free tier sufficient for single-user app
- Better performance at edge locations

## 9. CSV Import Format

The bulk import feature supports CSV files with the following format:

```
name,location,status,category,notes
"Microphone Stand","A2","STORED","Music Equipment","Black stand with boom arm"
"Drill","B3","STORED","Tools","DeWalt cordless"
"Holiday Lights","C1","OUT","Seasonal","LED string lights"
```

Required columns:
- `name`: Item name (text)
- `location`: Grid location A1-D4 (text)
- `status`: STORED or OUT (text)

Optional columns:
- `category`: Item category (text)
- `notes`: Additional information (text)
- Any other columns will be stored in the metadata object

## 10. Testing Strategy

### 10.1 Backend Testing

- Unit tests for Firebase Functions
- Integration tests for Firestore operations
- Webhook tests for Dialogflow integration

### 10.2 Frontend Testing

- Component tests for Svelte components
- End-to-end tests for critical user flows
- Accessibility testing

### 10.3 Voice Interface Testing

- Dialogflow console testing
- Real-world Google Assistant testing

## 11. Cost Analysis

Based on free tier limits and expected single-user usage:

| Service | Free Tier | Expected Usage | Monthly Cost |
|---------|-----------|----------------|--------------|
| Firebase Auth | 10K auth operations | <100 | $0 |
| Firestore | 1GB storage, 50K reads, 20K writes | <1K operations | $0 |
| Firebase Functions | 2M invocations | <5K | $0 |
| Firebase Hosting | 10GB transfer, 1GB storage | <100MB | $0 |
| Dialogflow | 1000 text requests/day | <50/day | $0 |
| Google Assistant | Free | N/A | $0 |
| Vercel/Netlify (alt) | Free tier | Single site | $0 |

**Total Expected Monthly Cost**: $0 (within free tier limits)

## 12. Future Enhancements

- Item categories and tagging
- Image uploads for items
- Voice command for listing all items in a specific location
- Expiry date tracking for perishable items
- Item sharing with household members
- Mobile app with barcode scanning
- Statistical usage reporting
