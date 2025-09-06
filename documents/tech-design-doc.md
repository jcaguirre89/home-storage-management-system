# Home Storage System - Technical Design Document

## 1. Overview

This document describes the technical architecture for a smart home storage tracking system. The system allows a user to track the location and status of items stored in rooms and bins using voice commands via Google Assistant, with a supplementary web interface.

### 1.1 Core Functionality

- Track item storage location using rooms and bins
- Voice command interface through Google Assistant
- Web interface for direct manipulation and bulk imports
- Status tracking for items (stored vs. removed)

### 1.2 User Interaction Flows

1. **Adding items**: "OK Google, I put the microphone stand in the garage, bin 2"
2. **Finding items**: "OK Google, where is the microphone stand?"
3. **Removing items**: "OK Google, I'm taking the microphone stand"
4. **Web interface**: Manual CRUD operations and CSV import
5. **Creating a Household (Web Interface)**:
    a. New user registers; their `householdId` is initially null.
    b. User is guided to a "Household Setup" page.
    c. User enters a desired name for their new household and submits.
    d. The UI calls `POST /api/households` with the chosen name.
    e. If successful, the user is now part of the new household, and their `householdId` is updated in their user profile.

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
│  React (Vite) │◄─────────────────────────┤   Firestore   │
│  Web App      │                          │   Database    │
└───────────────┘                          └───────────────┘
```

### 2.2 Core Components

- **Google Assistant**: Entry point for voice commands
- **Dialogflow**: Natural language processing to interpret commands
- **Firebase Functions**: Backend logic and API endpoints
- **Firestore**: NoSQL database for item storage
- **React (Vite) Web App**: User interface for direct interaction

## 3. Data Model

### 3.1 Firestore Collections

#### Items Collection
```json
{
  "items": {
    "{itemId}": {
      "name": "Microphone Stand",
      "location": {
        "roomId": "garageId",
        "binNumber": 2
      },
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

#### Rooms Subcollection
A new subcollection named `rooms` will be added under each household document (`households/{householdId}/rooms`).

```json
{
  "rooms": {
    "{roomId}": {
      "name": "Garage",
      "nBins": 16
    }
  }
}
```

#### Dialogflow Webhook
- `POST /api/dialogflow-webhook` - Entry point for Dialogflow fulfillment

### 3.2 Item States

- **STORED**: The item is currently in a tote at the specified location
- **OUT**: The item has been removed from storage

## 4. API Design

### 4.1 API Endpoints (Served by a Single '/api' Router Function)

#### Authentication
- `POST /api/register` - Create new user account
- `POST /api/reset_password` - Password reset flow

#### Items Management
- `GET /api/items` - List all items (with optional filters)
- `GET /api/items/{itemId}` - Get a specific item
- `POST /api/items` - Create a new item
- `PUT /api/items/{itemId}` - Update an item
- `DELETE /api/items/{itemId}` - Delete an item
- `POST /api/items/bulk` - Bulk import items via CSV

#### Room Management
- `POST /api/households/{householdId}/rooms` - Create a new room.
- `GET /api/households/{householdId}/rooms` - List all rooms.
- `GET /api/households/{householdId}/rooms/{roomId}` - Get a specific room.
- `PUT /api/households/{householdId}/rooms/{roomId}` - Update a room.
- `DELETE /api/households/{householdId}/rooms/{roomId}` - Delete a room.

#### Dialogflow Webhook
- `POST /api/dialogflow-webhook` - Entry point for Dialogflow fulfillment

#### Household Management
- `POST /api/households` - Create a new household. User becomes owner and a member. User's `householdId` in their user profile is updated.
    - **Request Body**: `{ "name": "My New Household Name" }`
    - **Response**: Standard success/error format with created household data.

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
  - `roomName` (required): The name of the room
  - `binNumber` (required): The bin number

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

#### `@RoomName` (List Type)
- Stores the names of the rooms created by the user.

#### `@BinNumber` (Number Type)
- Represents the bin number.

## 6. Frontend Architecture

### 6.1 UI Components

#### Dashboard View
- A single page application that displays the user's items in a room-centric view.
- Displays rooms as cards, with item and bin counts.
- Allows users to add, delete, and view rooms.
- Clicking on a room reveals its bins and the items within them.
- Provides a form to add a new item with name, category, and location (room and bin).
- Includes a bulk import feature to upload a CSV file of items.
- Displays errors to the user.

#### RoomSetup View
- Allows users to edit and delete existing rooms.

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



## 8. Cost Analysis

Based on free tier limits and expected single-user usage:

| Service | Free Tier | Expected Usage | Monthly Cost |
|---------|-----------|----------------|--------------|
| Firebase Auth | 10K auth operations | <100 | $0 |
| Firestore | 1GB storage, 50K reads, 20K writes | <1K operations | $0 |
| Firebase Functions | 2M invocations | <5K | $0 |
| Firebase Hosting | 10GB transfer, 1GB storage | <100MB | $0 |
| Dialogflow | 1000 text requests/day | <50/day | $0 |
| Google Assistant | Free | N/A | $0 |

**Total Expected Monthly Cost**: $0 (within free tier limits)

## 9. Future Enhancements

- Image uploads for items
- Voice command for listing all items in a specific location
- Expiry date tracking for perishable items
- Mobile app with barcode scanning
- Statistical usage reporting
