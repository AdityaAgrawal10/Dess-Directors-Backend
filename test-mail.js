// test-mail.js
const { sendMail } = require('./src/utils/mailer');

(async () => {
  await sendMail({
    to: 'adityaagrawal87831@gmail.com',
    subject: 'Test Email',
    html: '<p>Hello from Director Hiring Portal!</p>'
  });
})();
