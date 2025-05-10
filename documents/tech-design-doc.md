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
      "passwordHash": "[hashed password]",
      "created": "2025-05-08T12:00:00Z",
      "lastLogin": "2025-05-10T15:00:00Z"
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
- `POST /auth/login` - Authenticate user and return JWT
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
│   └── Layout/
│       ├── Header.svelte
│       ├── Footer.svelte
│       └── Navigation.svelte
├── routes/
│   ├── index.svelte
│   ├── login.svelte
│   ├── register.svelte
│   ├── dashboard.svelte
│   └── items/
│       ├── index.svelte
│       └── [id].svelte
├── stores/
│   ├── auth.js
│   └── items.js
├── services/
│   ├── api.js
│   └── firebase.js
└── App.svelte
```

### 6.2 UI Components

#### Dashboard View
- Storage grid visualization (A1-D4)
- Item count by location
- Recently added/removed items
- Quick search field

#### Items Management View
- Sortable/filterable table of all items
- Status indicators (stored/out)
- Edit/Delete actions
- Add new item form
- Bulk import button

#### Item Detail View
- Item information
- Location history
- Metadata editor
- Storage status toggle

## 7. Security Implementation

### 7.1 Authentication Flow

1. User enters email/password on login screen
2. Credentials sent to Firebase Auth service
3. Firebase validates credentials and returns JWT
4. JWT stored in browser localStorage/sessionStorage
5. JWT included in Authorization header for all API requests

### 7.2 Authorization Rules

Firestore security rules:

```
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can access the app
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Items can only be accessed by their owner
    match /items/{itemId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    // User profiles are protected
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
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
