# Logo Position Saving Implementation

## Current Implementation

### 1. **Position Saving (COMPLETED)**
Logo positions and sizes are now saved to Firebase in real-time when users adjust them:

```javascript
// Saved to campaign document under:
campaignData.logoPositions[designId][option] = { x, y, updatedAt }
campaignData.logoSizes[designId][option] = { width, height, updatedAt }
```

- Positions are saved in **inches** (e.g., x: 4.5, y: 3.0)
- Updates happen on every drag/resize action
- Data persists across page refreshes and modal open/close

### 2. **Position Loading (COMPLETED)**
When the DesignReviewSection component mounts:
- Fetches saved positions from Firebase
- Applies them to the respective design options (A/B)
- Falls back to default positions if none saved

## What Still Needs Implementation

### 1. **Image Compositing Options**

There are two approaches for final image generation:

#### Option A: Real-time Compositing (Current System)
- When campaign is processed, the system composites the logo onto the base image
- **REQUIRES**: Updating `processPostcardForPrint` to accept custom logo positions
- **PROS**: Flexible, can change logo position without regenerating base image
- **CONS**: Processing happens at print time

#### Option B: Pre-composited Images
- Composite and save the image immediately when user selects a design
- **REQUIRES**: New endpoint to generate and save composited images
- **PROS**: Faster processing at print time, what-you-see-is-what-you-get
- **CONS**: Need to regenerate if logo changes

### 2. **Current Processing Flow Issues**

The current `processPostcardForPrint` function:
- Uses a hardcoded `calculateLogoPosition` that always returns { x: 0.25, y: 0.25 }
- Doesn't accept custom positions as parameters
- Needs to be updated to:
  ```javascript
  processPostcardForPrint(
    aiImageUrl,
    brand,
    userId,
    campaignId,
    designId,
    customLogoPosition? // New parameter
  )
  ```

### 3. **Design Selection Update Needed**

When user selects Option A or B in the review page:
- Currently only saves which option was selected
- Needs to also save the logo position for that specific option
- Update the selection handler to include logo data

## Recommended Next Steps

1. **Update Image Processing Service**
   - Modify `processPostcardForPrint` to accept optional logo position
   - Use custom position if provided, otherwise fall back to default

2. **Update Campaign Processing**
   - When processing campaign, fetch saved logo positions
   - Pass them to the image processing service

3. **Consider Pre-compositing**
   - Add a "Save Final Design" button that composites immediately
   - Store the composited image URL in the campaign data
   - Use this for faster processing at print time

## Data Structure in Firebase

```javascript
campaigns/{campaignId}: {
  // ... other fields
  logoPositions: {
    [designId]: {
      A: { x: 4.5, y: 3.0, updatedAt: timestamp },
      B: { x: 1.0, y: 1.0, updatedAt: timestamp }
    }
  },
  logoSizes: {
    [designId]: {
      A: { width: 1.5, height: 1.0, updatedAt: timestamp },
      B: { width: 2.0, height: 1.5, updatedAt: timestamp }
    }
  }
}
```
