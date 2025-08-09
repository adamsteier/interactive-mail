import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  Timestamp, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  updateDoc,
  doc 
} from 'firebase/firestore';
import { sendEmail, EmailTemplates } from '@/emails/emailService';

const ADMIN_EMAIL = 'adam@posttimely.com';

interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  type: 'campaign_failed' | 'refund_request' | 'campaign_stuck' | 'general';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  campaignId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: Timestamp;
  sent: boolean;
  sentAt?: Timestamp;
  sendAttempts?: number;
  lastError?: string;
  sentVia?: string;
}

/**
 * Send email immediately with Firestore queuing as fallback
 */
async function sendNotificationEmail(
  notification: Omit<EmailNotification, 'createdAt' | 'sent'>,
  template: string,
  templateData: Record<string, string | number | boolean | null>
) {
  try {
    // Try to send email immediately
    const emailResult = await sendEmail({
      to: notification.to,
      subject: notification.subject,
      template,
      data: templateData,
      priority: notification.priority as 'low' | 'normal' | 'high' | 'urgent'
    });

    if (emailResult.success) {
      console.log('Email sent successfully:', {
        to: notification.to,
        subject: notification.subject,
        type: notification.type,
      });
      
      // Still queue for record keeping
      await addDoc(collection(db, 'emailNotifications'), {
        ...notification,
        createdAt: Timestamp.now(),
        sent: true,
        sentAt: Timestamp.now(),
        sentVia: 'sendgrid'
      });
      
      return { success: true };
    } else {
      throw new Error(emailResult.error || 'Failed to send email');
    }
    
  } catch (error) {
    console.error('Failed to send email, queuing for retry:', error);
    
    // Queue for later retry if immediate sending fails
    await addDoc(collection(db, 'emailNotifications'), {
      ...notification,
      createdAt: Timestamp.now(),
      sent: false,
      sendAttempts: 1,
      lastError: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Notify admin about a failed campaign
 */
export async function notifyFailedCampaign(
  campaignId: string,
  userEmail: string,
  error: string,
  leadCount: number,
  amount: number
) {
  const templateConfig = EmailTemplates.campaignFailed({
    campaignId,
    userEmail,
    error,
    leadCount,
    amount: amount / 100, // Convert cents to dollars
    failedAt: new Date().toLocaleString()
  });

  await sendNotificationEmail(
    {
      to: ADMIN_EMAIL,
      subject: templateConfig.subject,
      body: '', // Not used with templates
      type: 'campaign_failed',
      priority: 'urgent',
      campaignId,
      metadata: {
        userEmail,
        error,
        leadCount,
        amount,
      },
    },
    templateConfig.template,
    templateConfig.data
  );
}

/**
 * Notify admin about a refund request
 */
export async function notifyRefundRequest(
  campaignId: string,
  userEmail: string,
  originalAmount: number,
  refundAmount: number,
  reason: string,
  removedLeads: number,
  totalLeads: number,
  paymentIntentId: string = ''
) {
  const refundPercentage = Math.round((removedLeads / totalLeads) * 100);
  
  const templateConfig = EmailTemplates.refundRequest({
    campaignId,
    userEmail,
    originalAmount: originalAmount / 100,
    refundAmount: refundAmount / 100,
    reason,
    removedLeads,
    totalLeads,
    refundPercentage,
    paymentIntentId
  });

  await sendNotificationEmail(
    {
      to: ADMIN_EMAIL,
      subject: templateConfig.subject,
      body: '',
      type: 'refund_request',
      priority: 'high',
      campaignId,
      metadata: {
        userEmail,
        originalAmount,
        refundAmount,
        reason,
        removedLeads,
        totalLeads,
      },
    },
    templateConfig.template,
    templateConfig.data
  );
}

/**
 * Notify admin about a stuck campaign
 */
export async function notifyStuckCampaign(
  campaignId: string,
  userEmail: string,
  status: string,
  stuckDuration: string
) {
  // Create a simple template for stuck campaigns (we'll add the template later)
  const templateData = {
    campaignId,
    userEmail,
    status,
    stuckDuration,
    failedAt: new Date().toLocaleString()
  };

  await sendNotificationEmail(
    {
      to: ADMIN_EMAIL,
      subject: `⚠️ Campaign Stuck - ${campaignId.slice(0, 8)}`,
      body: '',
      type: 'campaign_stuck',
      priority: 'normal',
      campaignId,
      metadata: {
        userEmail,
        status,
        stuckDuration,
      },
    },
    'admin/campaign-failed', // Use existing template for now
    templateData
  );
}

/**
 * Send a general admin notification
 */
export async function notifyAdmin(
  subject: string,
  body: string,
  priority: 'urgent' | 'high' | 'normal' | 'low' = 'normal'
) {
  // For general notifications, use a simple template
  const templateData = {
    campaignId: 'general',
    userEmail: 'system',
    error: body,
    leadCount: 0,
    amount: 0,
    failedAt: new Date().toLocaleString()
  };

  await sendNotificationEmail(
    {
      to: ADMIN_EMAIL,
      subject,
      body,
      type: 'general',
      priority,
    },
    'admin/campaign-failed', // Use existing template for now
    templateData
  );
}

/**
 * Get pending email notifications (for future email service)
 */
export async function getPendingNotifications() {
  const snapshot = await getDocs(
    query(
      collection(db, 'emailNotifications'),
      where('sent', '==', false),
      orderBy('priority', 'desc'),
      orderBy('createdAt', 'asc'),
      limit(10)
    )
  );
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  } as EmailNotification & { id: string }));
}

/**
 * Send payment confirmation to customer
 */
export async function sendPaymentConfirmation(
  campaignId: string,
  userEmail: string,
  amount: number, // in cents
  leadCount: number,
  scheduledSendDate: Date,
  estimatedDeliveryStart: Date,
  estimatedDeliveryEnd: Date,
  pricePerPostcard: number,
  paymentMethod: string,
  isASAP: boolean = false
) {
  const templateConfig = EmailTemplates.paymentConfirmation({
    campaignId,
    userEmail,
    amount: amount / 100,
    leadCount,
    scheduledSendDate: scheduledSendDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    estimatedDeliveryStart: estimatedDeliveryStart.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    estimatedDeliveryEnd: estimatedDeliveryEnd.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric' 
    }),
    pricePerPostcard: pricePerPostcard / 100,
    paymentMethod,
    isASAP
  });

  await sendNotificationEmail(
    {
      to: userEmail,
      subject: templateConfig.subject,
      body: '',
      type: 'general',
      priority: 'normal',
      campaignId,
      metadata: {
        amount,
        leadCount,
        scheduledSendDate: scheduledSendDate.toISOString(),
      },
    },
    templateConfig.template,
    templateConfig.data
  );
}

// For processing queued emails (fallback system)
export async function sendQueuedEmails() {
  try {
    const pendingEmails = await getPendingNotifications();
    
    for (const notification of pendingEmails) {
      // Retry sending failed emails
      if (!notification.sent) {
        // Use a default template for queued emails
        const emailResult = await sendEmail({
          to: notification.to,
          subject: notification.subject,
          template: 'admin/campaign-failed', // Default template
          data: {
            campaignId: notification.campaignId || 'unknown',
            userEmail: notification.to,
            error: notification.body || notification.lastError || 'Queued notification',
            leadCount: 0,
            amount: 0,
            failedAt: notification.createdAt.toDate().toLocaleString()
          },
          priority: notification.priority as 'low' | 'normal' | 'high' | 'urgent'
        });
        
        if (emailResult.success) {
          // Mark as sent
          await updateDoc(doc(db, 'emailNotifications', notification.id), {
            sent: true,
            sentAt: Timestamp.now(),
            sentVia: 'sendgrid_retry'
          });
          
          console.log('Queued email sent successfully:', notification.id);
        }
      }
    }
  } catch (error) {
    console.error('Error processing queued emails:', error);
  }
} 