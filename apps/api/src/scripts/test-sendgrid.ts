/**
 * Test SendGrid Email Configuration
 * 
 * Run this script to test your SendGrid setup:
 * npm run test:sendgrid
 * or
 * ts-node -r tsconfig-paths/register src/scripts/test-sendgrid.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testSendGrid() {
  console.log('🧪 Testing SendGrid Configuration...\n');

  // Check environment variables
  const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';
  const apiKey = process.env.EMAIL_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@ntsamaela.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'Ntsamaela';

  console.log('📋 Configuration:');
  console.log(`   Provider: ${emailProvider}`);
  console.log(`   From Email: ${fromEmail}`);
  console.log(`   From Name: ${fromName}`);
  console.log(`   API Key: ${apiKey ? '✅ Set' : '❌ Missing'}\n`);

  if (emailProvider !== 'sendgrid') {
    console.log('⚠️  EMAIL_PROVIDER is not set to "sendgrid"');
    console.log('   Update your .env file: EMAIL_PROVIDER=sendgrid\n');
    return;
  }

  if (!apiKey) {
    console.log('❌ EMAIL_API_KEY is not set!');
    console.log('   Get your API key from: https://app.sendgrid.com/settings/api_keys');
    console.log('   Then add to .env: EMAIL_API_KEY=SG.your-key-here\n');
    return;
  }

  // Test SendGrid
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(apiKey);

    // Use a test email (you can change this)
    const testEmail = process.env.TEST_EMAIL || 'your-email@example.com';
    
    console.log(`📧 Sending test email to: ${testEmail}...\n`);

    const msg = {
      to: testEmail,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: 'Test Email from Ntsamaela',
      text: 'This is a test email from your Ntsamaela application. If you receive this, SendGrid is configured correctly!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #007bff;">✅ SendGrid Test Email</h2>
          <p>This is a test email from your <strong>Ntsamaela</strong> application.</p>
          <p>If you receive this email, your SendGrid configuration is working correctly! 🎉</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            Sent via SendGrid API<br>
            From: ${fromName} &lt;${fromEmail}&gt;
          </p>
        </div>
      `
    };

    await sgMail.send(msg);
    
    console.log('✅ SUCCESS! Test email sent successfully!');
    console.log(`   Check your inbox at: ${testEmail}\n`);
    console.log('🎉 SendGrid is properly configured!\n');

  } catch (error: any) {
    console.error('❌ ERROR sending test email:\n');
    
    if (error.response) {
      console.error('   Status Code:', error.response.statusCode);
      console.error('   Body:', JSON.stringify(error.response.body, null, 2));
      
      if (error.response.body?.errors) {
        error.response.body.errors.forEach((err: any) => {
          console.error(`   - ${err.message}`);
        });
      }
    } else {
      console.error('   Error:', error.message);
    }
    
    console.log('\n💡 Common issues:');
    console.log('   1. Invalid API key - Check your EMAIL_API_KEY in .env');
    console.log('   2. Unverified sender - Verify your sender email in SendGrid');
    console.log('   3. Domain not authenticated - Complete domain setup in SendGrid\n');
  }
}

// Run the test
testSendGrid().catch(console.error);

