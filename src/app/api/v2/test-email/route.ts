import { NextResponse } from 'next/server';
import { testEmailConnection, sendEmail, EmailTemplates } from '@/emails/emailService';

export async function GET() {
  try {
    console.log('Testing email system...');
    
    // Test 1: Connection test
    const connectionTest = await testEmailConnection();
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: 'Connection test failed',
        details: connectionTest.error
      }, { status: 500 });
    }
    
    // Test 2: Template test - Send a payment confirmation 
    const paymentTemplate = EmailTemplates.paymentConfirmation({
      campaignId: 'test_campaign_123',
      userEmail: 'test@posttimely.com',
      amount: 75.50,
      leadCount: 50,
      scheduledSendDate: 'Tuesday, January 14, 2025',
      estimatedDeliveryStart: 'Jan 21',
      estimatedDeliveryEnd: 'Jan 28, 2025',
      pricePerPostcard: 1.51,
      paymentMethod: 'Credit Card (Test)',
      isASAP: false
    });
    
    const paymentEmailResult = await sendEmail({
      to: 'adam@posttimely.com',
      subject: paymentTemplate.subject,
      template: paymentTemplate.template,
      data: paymentTemplate.data,
      priority: paymentTemplate.priority
    });
    
    // Test 3: Admin alert test
    const adminTemplate = EmailTemplates.campaignFailed({
      campaignId: 'test_failed_campaign_456',
      userEmail: 'testuser@example.com',
      error: 'Test error: OpenAI API timeout during image generation',
      leadCount: 25,
      amount: 37.75,
      failedAt: new Date().toLocaleString()
    });
    
    const adminEmailResult = await sendEmail({
      to: 'adam@posttimely.com',
      subject: adminTemplate.subject,
      template: adminTemplate.template,
      data: adminTemplate.data,
      priority: adminTemplate.priority
    });
    
    return NextResponse.json({
      success: true,
      message: 'Email system test completed',
      results: {
        connection: connectionTest,
        paymentEmail: paymentEmailResult,
        adminEmail: adminEmailResult
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Email test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Email test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { emailType, to } = await request.json();
    
    if (!emailType || !to) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: emailType, to'
      }, { status: 400 });
    }
    
    let result;
    
    switch (emailType) {
      case 'payment-confirmation':
        const paymentTemplate = EmailTemplates.paymentConfirmation({
          campaignId: 'test_' + Date.now(),
          userEmail: to,
          amount: 89.25,
          leadCount: 75,
          scheduledSendDate: 'Wednesday, January 15, 2025',
          estimatedDeliveryStart: 'Jan 22',
          estimatedDeliveryEnd: 'Jan 29, 2025',
          pricePerPostcard: 1.19,
          paymentMethod: 'Credit Card',
          isASAP: true
        });
        
        result = await sendEmail({
          to,
          subject: paymentTemplate.subject,
          template: paymentTemplate.template,
          data: paymentTemplate.data,
          priority: paymentTemplate.priority
        });
        break;
        
      case 'campaign-failed':
        const adminTemplate = EmailTemplates.campaignFailed({
          campaignId: 'test_' + Date.now(),
          userEmail: 'testcustomer@example.com',
          error: 'Test error: Simulated API failure for testing purposes',
          leadCount: 42,
          amount: 63.50,
          failedAt: new Date().toLocaleString()
        });
        
        result = await sendEmail({
          to,
          subject: adminTemplate.subject,
          template: adminTemplate.template,
          data: adminTemplate.data,
          priority: adminTemplate.priority
        });
        break;
        
      case 'refund-request':
        const refundTemplate = EmailTemplates.refundRequest({
          campaignId: 'test_' + Date.now(),
          userEmail: 'customer@example.com',
          originalAmount: 150.00,
          refundAmount: 37.50,
          reason: 'Test refund: 25% of addresses failed validation',
          removedLeads: 15,
          totalLeads: 60,
          refundPercentage: 25,
          paymentIntentId: 'pi_test_1234567890'
        });
        
        result = await sendEmail({
          to,
          subject: refundTemplate.subject,
          template: refundTemplate.template,
          data: refundTemplate.data,
          priority: refundTemplate.priority
        });
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid email type. Options: payment-confirmation, campaign-failed, refund-request'
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Email sent successfully' : 'Email failed to send',
      error: result.error,
      emailType,
      recipient: to,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 