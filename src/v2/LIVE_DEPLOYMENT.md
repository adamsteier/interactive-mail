# 🚨 LIVE DEPLOYMENT GUIDE

## When You're Ready to Make V2 Live

### Step 1: Complete Brand Selection Page
- ✅ Build `/v2/build/[campaignId]/brand/page.tsx`
- ✅ Test that it loads and displays properly
- ✅ Ensure it handles campaign data correctly

### Step 2: Make the Switch (Goes Live Immediately)

In `src/components/PlacesLeadsCollection.tsx`, line 287:

**Replace:**
```typescript
navigateToCampaignBuild(result.campaignId);
```

**With:**
```typescript
window.location.href = `/v2/build/${result.campaignId}/brand`;
```

### ⚠️ **CRITICAL**: This Change is Immediate
- The moment you make this change, all new campaigns use V2
- No rollback mechanism needed (single user)
- If something breaks, just revert the one line change

### Step 3: Test the Live Flow
1. Go through your normal lead collection process
2. Click "Create & Send with AI" 
3. Should redirect to `/v2/build/[campaignId]/brand`
4. Brand selection page should load

### Emergency Rollback
If anything goes wrong, immediately revert:
```typescript
// Emergency rollback - restore V1 navigation
navigateToCampaignBuild(result.campaignId);
```

## Current Status
- [ ] Brand selection page built and tested
- [ ] Ready to make the switch
- [ ] V2 is LIVE

---

**Remember**: You're the only user, so we can be aggressive with changes. If it works for you, it's production ready! 🚀 