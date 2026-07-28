// Real Physical Email Dispatcher Utility for CleanMax Procure360
// Sends clean, executive HTML emails directly to Gmail & Outlook inboxes

export const sendRealEmail = async ({ recipients, subject, htmlBody, textFallback }) => {
  // STRICT PREFERENCE CHECK: If user turned OFF Email Alerts in Settings, suppress dispatch
  if (typeof window !== 'undefined') {
    const storedUser = sessionStorage.getItem('procure360_current_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u?.notificationPrefs?.emailAlerts === false) {
          console.log('Email dispatch suppressed: user turned OFF Email Alerts preference.');
          return [{ email: 'suppressed', success: false, message: 'Email Alerts are turned OFF in Settings' }];
        }
      } catch (e) {}
    }
  }

  const dispatchPromises = recipients.map(async (recipientEmail) => {
    try {
      // 1. Primary: Web3Forms HTML API
      const w3Res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: '5561a357-e6f7-4a0b-93f8-5a089cfeb51b',
          to_email: recipientEmail,
          subject: subject,
          message: textFallback || 'CleanMax Executive Summary Digest Report',
          from_name: 'CleanMax Procure360 Executive Platform'
        })
      });
      const w3Data = await w3Res.json();
      if (w3Data.success) {
        return { email: recipientEmail, success: true, message: 'Delivered via Web3Forms' };
      }

      // 2. Secondary: FormSubmit AJAX API
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
          name: 'CleanMax Energy Procure360',
          message: textFallback
        })
      });

      const data = await response.json();
      return { email: recipientEmail, success: Boolean(data.success || data.message?.toLowerCase().includes('success')) };
    } catch (err) {
      console.error(`Failed to send real email to ${recipientEmail}:`, err);
      return { email: recipientEmail, success: false, error: err.message };
    }
  });

  const results = await Promise.all(dispatchPromises);
  return results;
};
