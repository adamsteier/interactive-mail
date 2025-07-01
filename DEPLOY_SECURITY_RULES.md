# Deploying Firestore Security Rules

## Current Status
**⚠️ CRITICAL**: Your production rules are currently `allow read, write: if true;` which allows anyone to read/write your entire database!

## Deploy the Secure Rules

### Method 1: Firebase Console (Quick)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Copy the entire contents of `firestore.rules` 
5. Paste into the rules editor
6. Click **Publish**

### Method 2: Firebase CLI (Recommended)
```bash
# If you haven't installed Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy only the Firestore rules
firebase deploy --only firestore:rules

# Or deploy everything (rules, functions, etc.)
firebase deploy
```

## What These Rules Do

### ✅ Anonymous User Support
- Anonymous users can create campaigns and leads
- Data is tied to their anonymous UID
- When they sign up, all data remains accessible

### ✅ Data Isolation
- Users can only access their own data
- Campaign owners control who can see their campaigns
- Business team members can collaborate

### ✅ Security Features
- Required fields validation
- Ownership verification
- Prevents unauthorized data modification
- Admin role support (for future)

### ✅ Protected Collections
- **campaigns**: Only owners can read/write
- **campaignLeads**: Only campaign owners can access
- **users**: Only the user themselves can read/update
- **sessions**: Support for anonymous → registered conversion
- **payments**: Read-only from client (server-only writes)

## Testing the Rules

### In Firebase Console Rules Playground:

1. **Test Anonymous User Creating Campaign**:
   - Authentication: `Authenticated` 
   - Provider: `Anonymous`
   - UID: `test-anon-123`
   - Path: `/campaigns/new-campaign-id`
   - Operation: `Create`
   - Data:
   ```json
   {
     "ownerUid": "test-anon-123",
     "status": "draft",
     "createdAt": "2024-01-01T00:00:00Z"
   }
   ```

2. **Test User Reading Own Campaign**:
   - Path: `/campaigns/{campaignId}`
   - Where campaign has `ownerUid: "your-test-uid"`

3. **Test Unauthorized Access (Should Fail)**:
   - Try to read another user's campaign
   - Try to modify ownerUid field
   - Try to create without required fields

## Important Notes

1. **Session Tracking**: The rules reference `request.auth.token.sessionId` which isn't standard. You may need to adjust this part:
   ```javascript
   // Current rule
   sessionId == request.auth.token.sessionId
   
   // Alternative: Store sessionId in the session document
   // and match against a field instead
   ```

2. **Team Members**: The rules support team members on businesses but your current implementation might not use this feature yet.

3. **Admin Role**: The `isAdmin()` function checks for custom claims which need to be set server-side:
   ```javascript
   // In a Cloud Function
   await admin.auth().setCustomUserClaims(uid, { admin: true });
   ```

## Post-Deployment Checklist

- [ ] Deploy rules using CLI or Console
- [ ] Test anonymous user can create campaign
- [ ] Test anonymous user can see their own campaigns
- [ ] Test authenticated user can see their campaigns
- [ ] Test user cannot see other users' campaigns
- [ ] Test campaign lead creation/reading
- [ ] Monitor Firebase Console for any permission errors

## Rollback Plan

If something goes wrong:
1. Keep the original rules backed up
2. In Firebase Console, you can view rule history
3. Revert to previous version if needed
4. Fix issues and redeploy

## Next Steps

After deploying these rules:
1. Update the `sessions` collection rules if needed for your session tracking
2. Add any custom validation rules for your specific business logic
3. Consider adding rate limiting rules to prevent abuse
4. Set up monitoring for permission denied errors 