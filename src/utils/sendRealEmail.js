// Real Physical Email Dispatcher Utility for CleanMax Procure360
// Uses FormSubmit AJAX API & Web3Forms to send real physical emails directly to Gmail & Outlook inboxes

export const sendRealEmail = async ({ recipients, subject, body }) => {
  const dispatchPromises = recipients.map(async (recipientEmail) => {
    try {
      // 1. Primary: FormSubmit AJAX API (Delivers directly to recipient's email address)
      const formSubmitUrl = `https://formsubmit.co/ajax/${encodeURIComponent(recipientEmail)}`;
      const response = await fetch(formSubmitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: subject,
          _captcha: 'false',
          sender: 'CleanMax Procure360 System',
          report_date: new Date().toLocaleString('en-IN'),
          recipients: recipients.join(', '),
          message: body
        })
      });

      const data = await response.json();
      console.log(`FormSubmit API Response for ${recipientEmail}:`, data);

      if (data.success === "true" || data.success === true || data.message?.toLowerCase().includes('success')) {
        return { email: recipientEmail, success: true, message: 'Email sent via FormSubmit API' };
      }

      // 2. Fallback: Web3Forms API
      const w3Res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: '5561a357-e6f7-4a0b-93f8-5a089cfeb51b',
          to_email: recipientEmail,
          subject: subject,
          message: body,
          from_name: 'CleanMax Procure360'
        })
      });
      const w3Data = await w3Res.json();
      return { email: recipientEmail, success: Boolean(w3Data.success), message: w3Data.message || 'Web3Forms response' };
    } catch (err) {
      console.error(`Failed to send real email to ${recipientEmail}:`, err);
      return { email: recipientEmail, success: false, error: err.message };
    }
  });

  const results = await Promise.all(dispatchPromises);
  return results;
};
