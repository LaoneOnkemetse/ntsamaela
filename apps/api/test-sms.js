const AfricasTalking = require('africastalking');
require('dotenv').config();

const username = process.env.SMS_USERNAME || 'sandbox';
const apiKey = process.env.SMS_API_KEY;

console.log('Testing Africa\'s Talking SMS...');
console.log('Username:', username);
console.log('API Key:', apiKey ? apiKey.substring(0, 20) + '...' : 'NOT SET');

if (!apiKey) {
  console.error('ERROR: SMS_API_KEY not set in .env file');
  process.exit(1);
}

const africastalking = AfricasTalking({
  username: username,
  apiKey: apiKey
});

const sms = africastalking.SMS;

const testNumber = '+26776118695'; // Replace with your test number
const testMessage = 'Test SMS from Ntsamaela - ' + new Date().toLocaleTimeString();

console.log('\nSending test SMS...');
console.log('To:', testNumber);
console.log('Message:', testMessage);

sms.send({
  to: [testNumber],
  message: testMessage,
  
})
.then((result) => {
  console.log('\n? SUCCESS!');
  console.log('Result:', JSON.stringify(result, null, 2));
})
.catch((error) => {
  console.error('\n? ERROR:');
  console.error('Error message:', error.message);
  console.error('Full error:', error);
});

