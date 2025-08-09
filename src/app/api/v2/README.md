# V2 API Endpoints Documentation

## Overview
This directory contains the API endpoints for the V2 campaign system. These endpoints handle payment processing, campaign fulfillment, and monitoring.

## Authentication Overview

All API endpoints now have proper authentication:

- **User Routes**: Require Firebase ID token in `Authorization: Bearer <token>` header
- **Admin Routes**: Require Firebase ID token + admin status in Firestore
- **Cron Routes**: Require `CRON_SECRET` in `Authorization: Bearer <secret>` header  
- **Test Routes**: Only available in development or when `ALLOW_TEST_ROUTES=true`

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
- **Authentication**: Required (Bearer token with CRON_SECRET)
- **Usage**: Set up daily cron job to call this endpoint

## Admin Endpoints

### `/api/v2/admin/update-status`
- **Method**: POST
- **Purpose**: Manually update campaign status (admin only)
- **Authentication**: Required (Firebase ID token + admin status)
- **Body**:
  ```json
  {
    "campaignId": "string",
    "status": "paid" | "processing" | "sent" | "failed" | "scheduled"
  }
  ```

### `/api/v2/admin/retry-campaign`
- **Method**: POST
- **Purpose**: Retry failed campaign processing (admin only)
- **Authentication**: Required (Firebase ID token + admin status)
- **Body**:
  ```json
  {
    "campaignId": "string"
  }
  ```

### `/api/v2/admin/refund-request`
- **Method**: POST
- **Purpose**: Queue refund request notification (admin only)
- **Authentication**: Required (Firebase ID token + admin status)
- **Body**:
  ```json
  {
    "campaignId": "string",
    "userEmail": "string",
    "originalAmount": number,
    "refundAmount": number,
    "reason": "string",
    "affectedLeads": number,
    "totalLeads": number
  }
  ```

### `/api/webhooks/stannp`
- **Method**: POST
- **Purpose**: Receive status updates from Stannp
- **Authentication**: None (webhook endpoint)
- **Events handled**: printed, dispatched, delivered, returned

## Test Endpoints

**Note**: Test endpoints are only available in development mode or when `ALLOW_TEST_ROUTES=true` environment variable is set.

### `/api/v2/test-image-processing`
- **Method**: POST
- **Purpose**: Test image upscaling and logo overlay
- **Authentication**: Development environment only
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
- **Authentication**: Development environment only
- **Query params**: 
  - `action`: "test" | "create" | "status"
  - `mailpieceId`: (for status action)

### `/api/v2/test-campaign-processing`
- **Method**: POST
- **Purpose**: Test the campaign processing service
- **Authentication**: Development environment only
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
- **Authentication**: Development environment only
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

# Security
CRON_SECRET=your_secret_for_cron_jobs
ALLOW_TEST_ROUTES=false  # Set to 'true' to enable test routes in production
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