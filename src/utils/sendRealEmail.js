// Real Physical Email Dispatcher Utility for CleanMax Procure360

export const sendRealEmail = async ({ recipients, subject, body, apiKey = '' }) => {
  const activeKey = apiKey || '5561a357-e6f7-4a0b-93f8-5a089cfeb51b'; // Default Web3Forms Key
  
  const dispatchPromises = recipients.map(async (recipientEmail) => {
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          access_key: activeKey,
          name: 'CleanMax Procure360 System',
          email: 'noreply@cleanmax.com',
          to_email: recipientEmail,
          subject: subject,
          message: body,
          from_name: 'CleanMax Executive Reports'
        })
      });

      const data = await response.json();
      return { email: recipientEmail, success: data.success, message: data.message };
    } catch (err) {
      console.error(`Failed to send real email to ${recipientEmail}:`, err);
      return { email: recipientEmail, success: false, error: err.message };
    }
  });

  const results = await Promise.all(dispatchPromises);
  return results;
};
