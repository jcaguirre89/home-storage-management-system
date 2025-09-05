# Feature Specification: Household Rooms and Bins

## 1. Overview

This document outlines the implementation plan for adding a new feature that allows users to define "rooms" within their household and, for each room, specify a configurable number of "bins". Item locations will then be updated to reference these room-specific bin numbers.

## 2. Goal

To provide a more granular and flexible way for users to organize their stored items by associating them with specific physical locations (rooms) and precise bin numbers within those rooms.

## 3. Phases of Implementation

This feature will be implemented in three main phases: Data Model Updates, Backend (Firebase Functions) Updates, and Frontend (React-Vite) Updates.

### Phase 1: Data Model Updates

#### 3.1.1 Firestore Schema Changes

*   **`households` Collection:**
    *   A new subcollection named `rooms` will be added under each household document (`households/{householdId}/rooms`).
    *   Each document in the `rooms` subcollection (`households/{householdId}/rooms/{roomId}`) will represent a single room and will contain the following fields:
        *   `name` (string): The name of the room (e.g., "Garage", "Basement Storage").
        *   `nBins` (number): The total number of bins in this room (e.g., 10). Bins will be numbered 1 to `nBins`.

    **Example `households` document with `rooms` subcollection:**
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
          "created": "2025-05-07T10:00:00Z",
          "rooms": { // New subcollection
            "{roomId1}": {
              "name": "Garage",
              "nBins": 16
            },
            "{roomId2}": {
              "name": "Basement Storage",
              "nBins": 15
            }
          }
        }
      }
    }
    ```

*   **`items` Collection:**
    *   The `location` field in each item document will be updated from a simple string (e.g., "A2") to an object.
    *   The new `location` object will contain:
        *   `roomId` (string): The ID of the room where the item is located.
        *   `binNumber` (number): The bin number within that room (e.g., 1, 5, 10).

    **Example `items` document with updated `location` field:**
    ```json
    {
      "items": {
        "{itemId}": {
          "name": "Microphone Stand",
          "location": { // Changed to an object
            "roomId": "garageId", // Reference to the room ID
            "binNumber": 2 // The bin number within that room
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

#### 3.1.2 Impact on Existing Data

*   The change to the `location` field in the `items` collection is a **breaking change** for existing data that uses the old string-based location format.
*   **Migration Strategy:** For the initial implementation, we will assume that new items will use the new structure. A separate migration script or process will be required to update existing items in the database to the new `location` object format. This is out of scope for the initial feature implementation.

### Phase 2: Backend (Firebase Functions) Updates

#### 3.2.1 API Endpoints for Room Management

New API endpoints will be added to manage rooms within a household:

*   **`POST /api/households/{householdId}/rooms`**
    *   **Purpose:** Create a new room for the specified household.
    *   **Authentication:** Required.
    *   **Request Body:**
        ```json
        {
          "name": "string",
          "nBins": number
        }
        ```
    *   **Response:** Standard success/error format with the created room data (including its `roomId`).

*   **`GET /api/households/{householdId}/rooms`**
    *   **Purpose:** List all rooms for the specified household.
    *   **Authentication:** Required.
    *   **Response:** Standard success/error format with an array of room data.

*   **`GET /api/households/{householdId}/rooms/{roomId}`**
    *   **Purpose:** Get details of a specific room within the household.
    *   **Authentication:** Required.
    *   **Response:** Standard success/error format with the room data.

*   **`PUT /api/households/{householdId}/rooms/{roomId}`**
    *   **Purpose:** Update an existing room's details.
    *   **Authentication:** Required.
    *   **Request Body:** (Partial update)
        ```json
        {
          "name"?: "string",
          "nBins"?: number
        }
        ```
    *   **Response:** Standard success/error format with the updated room data.

*   **`DELETE /api/households/{householdId}/rooms/{roomId}`**
    *   **Purpose:** Delete a specific room from the household.
    *   **Authentication:** Required.
    *   **Response:** Standard success/error format (e.g., `{ "success": true, "data": { "message": "Room deleted." } }`).

#### 3.2.2 Update Existing Item CRUD Logic

Existing item management functions in `functions/main.py` will need modifications:

*   **`_create_item_logic` and `_update_item_logic`:**
    *   Adjust to accept and validate the new `location` object (`{ roomId, binNumber }`) instead of a simple string.
    *   Ensure that `roomId` refers to an existing room within the user's household.
    *   Validate `binNumber` against the `nBins` defined for the specified `roomId`.
*   **`_get_items_logic` and `_get_item_logic`:**
    *   Ensure these functions correctly retrieve and return item data with the new `location` object format.
*   **`_bulk_import_items_logic`:**
    *   Modify to parse CSV data into the new `location` object format.
    *   The CSV input will likely require separate columns for `roomName` (or `roomId`) and `binNumber`.
    *   Logic will need to map `roomName` to `roomId` (e.g., by looking up existing rooms).

### Phase 3: Frontend (React-Vite) Updates

#### 3.3.1 New UI for Room and Bin Management

*   A new React component (e.g., `RoomSetup.tsx`) will be created to handle the creation, listing, editing, and deletion of rooms and their bin configurations.
*   This component will include:
    *   A form for adding a new room (input for name, number of bins).
    *   A list displaying existing rooms, with options to edit or delete each room.

#### 3.3.2 Integrate Room Setup into Household Flow

*   Modify `HouseholdSetup.tsx`:
    *   After a user successfully creates a household, they should be guided to the `RoomSetup.tsx` view to define their first room(s).
    *   If a user already belongs to a household, they should have an option (e.g., a button in the dashboard or sidebar) to navigate to the `RoomSetup.tsx` view to manage their rooms.

#### 3.3.3 Update Item Forms

*   Modify the item creation and update forms in `Dashboard.tsx`:
    *   Replace the single `location` input with two inputs:
        *   A dropdown/selector for `roomId` (listing available rooms in the user's household).
        *   An input for `binNumber` (e.g., a text input, or a more advanced component that helps with valid bin numbers based on the selected room's `nBins`).
    *   The `binNumber` input should ideally provide validation or a picker that respects the `nBins` of the selected room.

#### 3.3.4 Update Item Display

*   Modify the item display in `Dashboard.tsx` (and potentially other views where items are shown) to display both the room name (looked up from `roomId`) and the `binNumber` for each item.

## 5. Comparison with Current Implementation

This section highlights the key differences and necessary changes from the existing system as described in the [Technical Design Document](tech-design-doc.md).

### 5.1 Data Model Changes

*   **`items` Collection - `location` field:**
    *   **Current (as per Tech Design Doc):** A simple string representing a **grid coordinate** (e.g., `"A2"`).
    *   **New (as per this spec):** An object `{ "roomId": "string", "binNumber": number }` where `binNumber` is a simple integer (e.g., 1, 5, 10) representing a bin within a room, moving away from the grid system. This is a **breaking change** for existing data.

*   **`households` Collection:**
    *   **Current (as per Tech Design Doc):** Contains `name`, `ownerUserId`, `memberUserIds`, and `created` fields.
    *   **New (as per this spec):** Will include a new `rooms` subcollection (`households/{householdId}/rooms/{roomId}`) to store room-specific data (`name`, `nBins`).

### 5.2 Backend (Firebase Functions) Changes

*   **Item Management API Endpoints (`/api/items`):**
    *   **Current (as per Tech Design Doc):** `POST`, `PUT`, `GET` operations for items expect/return a string `location`.
    *   **New (as per this spec):** These endpoints will be modified to expect/return the new `location` object (`{ roomId, binNumber }`). Validation logic will be added to ensure `roomId` exists within the household and `binNumber` is within the `nBins` range for that room.
    *   **Bulk Import (`POST /api/items/bulk`):**
        *   **Current (as per Tech Design Doc):** Expects CSV data with a simple string `location`.
        *   **New (as per this spec):** Will need to parse CSV data into the new `location` object format, likely requiring `roomName` and `binNumber` columns in the CSV, and mapping `roomName` to `roomId`.

*   **Household Management API Endpoints (`/api/households`):**
    *   **Current (as per Tech Design Doc):** Primarily `POST /api/households` for creating a household.
    *   **New (as per this spec):** New dedicated API endpoints will be introduced for managing rooms within a household (`POST`, `GET`, `PUT`, `DELETE /api/households/{householdId}/rooms`).

### 5.3 Frontend (React-Vite) Changes

*   **Item Forms (e.g., in `Dashboard.tsx`):**
    *   **Current (as per Tech Design Doc):** A single input field for the string `location` (e.g., "A2").
    *   **New (as per this spec):** The single `location` input will be replaced by two distinct inputs: a dropdown/selector for `roomId` (displaying room names) and an input for `binNumber`.

*   **Item Display (e.g., in `Dashboard.tsx`):**
    *   **Current (as per Tech Design Doc):** Displays the string `location` (e.g., "A2").
    *   **New (as per this spec):** Will display both the room name (derived from `roomId`) and the `binNumber`.

*   **Household Setup Flow (`HouseholdSetup.tsx`):**
    *   **Current (as per Tech Design Doc):** After household creation, the user is simply part of the new household.
    *   **New (as per this spec):** After household creation, the user will be guided to a new `RoomSetup.tsx` component to define rooms. Existing household members will also have an option to access this `RoomSetup.tsx` component.

*   **New UI Components:**
    *   **Current:** No dedicated UI for managing storage locations beyond item forms.
    *   **New:** A new `RoomSetup.tsx` component will be introduced for creating, listing, editing, and deleting rooms and their bin configurations.

### 5.4 Dialogflow / Voice Command Changes

*   **`@Location` Entity:**
    *   **Current (as per Tech Design Doc):** Defined as a composite entity matching **grid patterns** like `[A-D][1-4]` (e.g., "A1", "B3").
    *   **New (as per this spec):** The concept of a single grid-based `@Location` entity will be replaced. Voice commands will now require both a room name and a bin number (e.g., "in the garage, bin 2"). This implies changes to intent training phrases and parameter extraction to capture both `roomName` and `binNumber` instead of a single grid `location` string.

## 6. Open Questions / Considerations

*   **Voice Commands:** How will the new room structure impact existing Google Assistant voice commands (e.g., "I put the microphone stand in bin 2")? Will commands need to include the room name (e.g., "I put the microphone stand in bin 2 in the garage")? answer: YES
*   **Error Handling:** Comprehensive error handling for invalid room/bin inputs and item locations will be crucial.