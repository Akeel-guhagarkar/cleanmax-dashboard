// Real Physical Email Dispatcher Utility for CleanMax Procure360
// Sends real physical emails with attached Excel (.xlsx) files directly to Gmail & Outlook inboxes

export const sendRealEmail = async ({ recipients, subject, body, excelBlob, filename }) => {
  const dispatchPromises = recipients.map(async (recipientEmail) => {
    try {
      const formData = new FormData();
      formData.append('_subject', subject);
      formData.append('_captcha', 'false');
      formData.append('message', body);

      if (excelBlob) {
        formData.append('attachment', excelBlob, filename || `CleanMax_Executive_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      }

      const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipientEmail)}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: formData
      });

      const data = await response.json();
      console.log(`FormSubmit Attachment API Response for ${recipientEmail}:`, data);

      if (data.success === "true" || data.success === true || data.message?.toLowerCase().includes('success')) {
        return { email: recipientEmail, success: true, message: 'Email sent with Excel attachment via FormSubmit' };
      }

      // Fallback: Web3Forms
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
      return { email: recipientEmail, success: Boolean(w3Data.success) };
    } catch (err) {
      console.error(`Failed to send real email to ${recipientEmail}:`, err);
      return { email: recipientEmail, success: false, error: err.message };
    }
  });

  const results = await Promise.all(dispatchPromises);
  return results;
};
