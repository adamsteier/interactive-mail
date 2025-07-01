# Firestore Security Rules Update for Anonymous Users

Add these rules to your Firebase Console Firestore Security Rules to support anonymous users creating campaigns:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Function to check if user is authenticated (including anonymous)
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Function to check if user owns the resource
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }
    
    // Campaigns collection
    match /campaigns/{campaignId} {
      // Allow authenticated users (including anonymous) to read their own campaigns
      allow read: if isAuthenticated() && isOwner(resource.data.ownerUid);
      
      // Allow authenticated users (including anonymous) to create campaigns
      allow create: if isAuthenticated() && 
        request.resource.data.ownerUid == request.auth.uid;
      
      // Allow users to update their own campaigns
      allow update: if isAuthenticated() && isOwner(resource.data.ownerUid);
      
      // Allow users to delete their own campaigns
      allow delete: if isAuthenticated() && isOwner(resource.data.ownerUid);
      
      // Campaign leads subcollection
      match /leads/{leadId} {
        // Allow campaign owner to read/write leads
        allow read, write: if isAuthenticated() && 
          isOwner(get(/databases/$(database)/documents/campaigns/$(campaignId)).data.ownerUid);
      }
    }
    
    // CampaignLeads collection (if using flat structure)
    match /campaignLeads/{leadId} {
      // Get the campaign to check ownership
      allow read: if isAuthenticated() && 
        isOwner(get(/databases/$(database)/documents/campaigns/$(resource.data.campaignId)).data.ownerUid);
        
      allow create: if isAuthenticated() && 
        isOwner(get(/databases/$(database)/documents/campaigns/$(request.resource.data.campaignId)).data.ownerUid);
        
      allow update, delete: if isAuthenticated() && 
        isOwner(get(/databases/$(database)/documents/campaigns/$(resource.data.campaignId)).data.ownerUid);
    }
    
    // Sessions collection for tracking anonymous users
    match /sessions/{sessionId} {
      // Allow anyone to create a session
      allow create: if true;
      
      // Allow reading and updating own session
      allow read, update: if sessionId == request.auth.token.sessionId || 
        (request.auth != null && resource.data.convertedToUserId == request.auth.uid);
    }
  }
}
```

## Important Notes:

1. **Anonymous Users**: Firebase anonymous authentication creates real user IDs, so anonymous users can create and own documents just like regular users.

2. **Account Linking**: When an anonymous user signs up or logs in, Firebase automatically preserves their UID, so all their data remains accessible.

3. **Data Migration**: No data migration is needed when converting from anonymous to permanent account - the UID stays the same.

4. **Session Tracking**: The sessions collection is optional but useful for analytics and tracking conversions.

5. **Security**: Anonymous users can only access their own data, just like regular users.

## Implementation Steps:

1. Copy these rules to your Firebase Console
2. Test in the Rules Playground with anonymous auth tokens
3. Deploy to production

## Testing the Rules:

Test these scenarios in the Firebase Console Rules Playground:
- Anonymous user creating a campaign
- Anonymous user reading their own campaign
- Anonymous user trying to read another user's campaign (should fail)
- Converted user accessing their pre-conversion campaigns 