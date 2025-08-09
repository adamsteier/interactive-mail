// Server-side only imports with runtime checks
let sgMail: any = null;
let fs: any = null;
let path: any = null;

// Only import server-side modules if we're running on the server
if (typeof window === 'undefined') {
  try {
    sgMail = require('@sendgrid/mail').default;
    fs = require('fs');
    path = require('path');
    
    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  } catch (error) {
    console.warn('Server-side modules not available:', error);
  }
}

const FROM_EMAIL = 'noreply@posttimely.com';
const FROM_NAME = 'PostTimely';

interface EmailData {
  [key: string]: any;
}

interface EmailOptions {
  to: string;
  subject: string;
  template: string; // e.g., 'admin/campaign-failed'
  data: EmailData;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  trackClicks?: boolean;
  trackOpens?: boolean;
}

/**
 * Simple template engine for replacing {{variables}} in HTML
 */
function renderTemplate(html: string, data: EmailData): string {
  let rendered = html;
  
  // Replace simple variables like {{campaignId}}
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, String(data[key] || ''));
  });
  
  // Handle conditional blocks like {{#if isASAP}}
  rendered = rendered.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/g, (match, condition, content) => {
    return data[condition] ? content : '';
  });
  
  // Handle inverted conditional blocks like {{#unless isASAP}}
  rendered = rendered.replace(/{{#unless\s+(\w+)}}(.*?){{\/unless}}/g, (match, condition, content) => {
    return !data[condition] ? content : '';
  });
  
  return rendered;
}

/**
 * Load and compile email template
 */
async function loadTemplate(templateName: string, data: EmailData): Promise<{ html: string; text: string }> {
  // Runtime check for server-side modules
  if (!fs || !path) {
    throw new Error('Email service can only be used on the server side');
  }
  
  try {
    // Load the main template
    const templatePath = path.join(process.cwd(), 'src', 'emails', 'templates', `${templateName}.html`);
    let html = fs.readFileSync(templatePath, 'utf8');
    
    // Load header component
    const headerPath = path.join(process.cwd(), 'src', 'emails', 'components', 'header.html');
    const headerHtml = fs.readFileSync(headerPath, 'utf8');
    
    // Load footer component  
    const footerPath = path.join(process.cwd(), 'src', 'emails', 'components', 'footer.html');
    const footerHtml = fs.readFileSync(footerPath, 'utf8');
    
    // Replace partials
    html = html.replace(/{{>header.*?}}/g, headerHtml);
    html = html.replace(/{{>footer.*?}}/g, footerHtml);
    
    // Render variables
    html = renderTemplate(html, data);
    
    // Generate text version (strip HTML tags)
    const text = html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();
    
    return { html, text };
    
  } catch (error) {
    console.error('Error loading email template:', error);
    throw new Error(`Failed to load email template: ${templateName}`);
  }
}

/**
 * Send email using SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Runtime check for server-side modules
    if (!sgMail) {
      throw new Error('Email service can only be used on the server side');
    }
    
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY environment variable not set');
    }
    
    // Load and render template
    const { html, text } = await loadTemplate(options.template, options.data);
    
    // Prepare email message
    const msg = {
      to: options.to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject: options.subject,
      html,
      text,
      trackingSettings: {
        clickTracking: {
          enable: options.trackClicks !== false
        },
        openTracking: {
          enable: options.trackOpens !== false
        }
      },
      categories: [
        'posttimely',
        options.template.split('/')[0], // 'admin', 'customer', 'system'
        options.priority || 'normal'
      ]
    };
    
    // Send email
    const response = await sgMail.send(msg);
    
    console.log('Email sent successfully:', {
      to: options.to,
      subject: options.subject,
      template: options.template,
      messageId: response[0].headers['x-message-id']
    });
    
    return { success: true };
    
  } catch (error) {
    console.error('Error sending email:', error);
    
    // SendGrid specific error handling
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as any;
      console.error('SendGrid error details:', {
        statusCode: sgError.response?.statusCode,
        body: sgError.response?.body
      });
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error'
    };
  }
}

/**
 * Email template helpers for common campaigns
 */
export const EmailTemplates = {
  // Admin notifications
  campaignFailed: (data: {
    campaignId: string;
    userEmail: string;
    error: string;
    leadCount: number;
    amount: number;
    failedAt: string;
  }) => ({
    template: 'admin/campaign-failed',
    subject: `🚨 URGENT: Campaign Failed - ${data.campaignId.slice(0, 8)}`,
    data,
    priority: 'urgent' as const
  }),
  
  refundRequest: (data: {
    campaignId: string;
    userEmail: string;
    originalAmount: number;
    refundAmount: number;
    reason: string;
    removedLeads: number;
    totalLeads: number;
    refundPercentage: number;
    paymentIntentId: string;
  }) => ({
    template: 'admin/refund-request',
    subject: `💰 Refund Request - ${data.campaignId.slice(0, 8)}`,
    data,
    priority: 'high' as const
  }),
  
  // Customer notifications
  paymentConfirmation: (data: {
    campaignId: string;
    userEmail: string;
    amount: number;
    leadCount: number;
    scheduledSendDate: string;
    estimatedDeliveryStart: string;
    estimatedDeliveryEnd: string;
    pricePerPostcard: number;
    paymentMethod: string;
    isASAP: boolean;
  }) => ({
    template: 'customer/payment-confirmation',
    subject: '✅ Payment Confirmed - Your Campaign is Being Processed',
    data,
    priority: 'normal' as const
  })
};

/**
 * Batch send emails (for bulk notifications)
 */
export async function sendBatchEmails(emails: EmailOptions[]): Promise<{
  successful: number;
  failed: number;
  errors: string[];
}> {
  const results = await Promise.allSettled(
    emails.map(email => sendEmail(email))
  );
  
  let successful = 0;
  let failed = 0;
  const errors: string[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      successful++;
    } else {
      failed++;
      const error = result.status === 'rejected' 
        ? result.reason 
        : result.value.error;
      errors.push(`Email ${index + 1}: ${error}`);
    }
  });
  
  return { successful, failed, errors };
}

/**
 * Test email connection
 */
export async function testEmailConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const testEmail: EmailOptions = {
      to: 'adam@posttimely.com',
      subject: '✅ PostTimely Email Service Test',
      template: 'admin/campaign-failed', // Use existing template for test
      data: {
        campaignId: 'test_12345678',
        userEmail: 'test@example.com',
        error: 'This is a test email to verify SendGrid integration',
        leadCount: 50,
        amount: 75.00,
        failedAt: new Date().toISOString()
      },
      priority: 'normal'
    };
    
    return await sendEmail(testEmail);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    };
  }
} 