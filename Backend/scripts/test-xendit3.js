require('dotenv').config();
const key = process.env.XENDIT_SECRET_KEY;
const auth = Buffer.from(key + ':').toString('base64');
fetch('https://api.xendit.co/payment_requests', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + auth
  },
  body: JSON.stringify({
    reference_id: "test-FF-" + Date.now(),
    currency: "PHP",
    amount: 100,
    payment_method: {
      type: "EWALLET",
      reusability: "ONE_TIME_USE",
      ewallet: {
        channel_code: "GCASH",
        channel_properties: {
          success_return_url: "http://localhost:3000",
          failure_return_url: "http://localhost:3000"
        }
      }
    }
  })
}).then(r => r.json()).then(console.log).catch(console.error);
