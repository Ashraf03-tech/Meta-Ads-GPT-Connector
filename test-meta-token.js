import 'dotenv/config';
import axios from 'axios';

const token = process.env.METAAPI_ACCESS_TOKEN;

axios.get('https://graph.facebook.com/v20.0/me/adaccounts', {
  params: { access_token: token }
})
.then(res => {
  console.log('Ad Accounts:', JSON.stringify(res.data, null, 2));
})
.catch(err => {
  if (err.response) {
    console.error('Meta API Error:', err.response.data);
  } else {
    console.error('Error:', err.message);
  }
});
