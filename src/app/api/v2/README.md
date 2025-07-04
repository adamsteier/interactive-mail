# V2 API Endpoints Documentation

## Overview
This directory contains the API endpoints for the V2 campaign system. These endpoints handle payment processing, campaign fulfillment, and monitoring.

## Production Endpoints

### `/api/v2/create-payment-intent`
- **Method**: POST
- **Purpose**: Create a Stripe PaymentIntent for campaign payment
- **Authentication**: Required (Firebase ID token)
- **Body**:
  ```json
  {
    "campaignId": "string",
    "scheduledSendDate": "ISO 8601 date string"
  }
  ```

### `/api/v2/trigger-campaign-processing`
- **Method**: POST
- **Purpose**: Trigger campaign processing after successful payment
- **Authentication**: None (called internally after payment)
- **Body**:
  ```json
  {
    "campaignId": "string",
    "scheduledSendDate": "ISO 8601 date string"
  }
  ```
- **Behavior**:
  - ASAP campaigns: Process immediately
  - Future dated campaigns: Mark as 'scheduled'

### `/api/v2/process-scheduled-campaigns`
- **Method**: GET/POST
- **Purpose**: Process all campaigns scheduled for today (called by cron job)
- **Authentication**: Optional (Bearer token with CRON_SECRET)
- **Usage**: Set up daily cron job to call this endpoint

### `/api/webhooks/stannp`
- **Method**: POST
- **Purpose**: Receive status updates from Stannp
- **Authentication**: None (webhook endpoint)
- **Events handled**: printed, dispatched, delivered, returned

## Test Endpoints

### `/api/v2/test-image-processing`
- **Method**: POST
- **Purpose**: Test image upscaling and logo overlay
- **Body**:
  ```json
  {
    "aiImageUrl": "string",
    "logoUrl": "string",
    "logoPosition": {
      "x": 0.25,
      "y": 0.25,
      "width": 1.0,
      "height": 0.5
    }
  }
  ```

### `/api/v2/test-stannp`
- **Method**: GET/POST
- **Purpose**: Test Stannp API integration
- **Query params**: 
  - `action`: "test" | "create" | "status"
  - `mailpieceId`: (for status action)

### `/api/v2/test-campaign-processing`
- **Method**: POST
- **Purpose**: Test the campaign processing service
- **Body**:
  ```json
  {
    "campaignId": "string",
    "checkOnly": false
  }
  ```

### `/api/v2/test-full-flow`
- **Method**: GET/POST
- **Purpose**: Test the complete campaign flow
- **GET**: Check campaign status
  - Query: `?campaignId=YOUR_CAMPAIGN_ID`
- **POST**: Simulate actions
  - Body:
    ```json
    {
      "campaignId": "string",
      "action": "simulatePayment" | "processNow"
    }
    ```

## Environment Variables Required

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Stannp
STANNP_API_KEY=your_api_key
NEXT_PUBLIC_STANNP_REGION=US  # or EU

# Optional
CRON_SECRET=your_secret_for_cron_jobs
NEXT_PUBLIC_APP_URL=https://www.magicmailing.com/
```

## Testing Workflow

1. Create a campaign through the UI
2. Complete the design process
3. Use `/api/v2/test-full-flow` to simulate payment:
   ```bash
   POST /api/v2/test-full-flow
   {
     "campaignId": "YOUR_CAMPAIGN_ID",
     "action": "simulatePayment"
   }
   ```
4. Process the campaign:
   ```bash
   POST /api/v2/test-full-flow
   {
     "campaignId": "YOUR_CAMPAIGN_ID",
     "action": "processNow"
   }
   ```
5. Check status:
   ```bash
   GET /api/v2/test-full-flow?campaignId=YOUR_CAMPAIGN_ID
   ```

## Production Deployment Notes

1. Set up daily cron job for `/api/v2/process-scheduled-campaigns`
2. Configure Stannp webhook URL: `https://www.magicmailing.com/api/webhooks/stannp`
3. Ensure all environment variables are set in Vercel
4. Monitor logs for processing errors
5. Set up alerts for failed campaigns

## Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "error": "Error message",
  "details": {} // Optional additional context
}
```

Success responses:
```json
{
  "success": true,
  "data": {} // Endpoint-specific data
}
``` 