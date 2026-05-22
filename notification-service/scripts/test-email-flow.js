/**
 * Verifica el flujo render + envío SMTP (jsonTransport, sin red real).
 * Ejecutar: node scripts/test-email-flow.js
 */
const nodemailer = require('nodemailer');

async function main() {
  const brokenDefault = require('nodemailer').default;
  if (brokenDefault !== undefined) {
    throw new Error('Expected nodemailer default import to be undefined under CommonJS');
  }

  const transporter = nodemailer.createTransport({ jsonTransport: true });
  const result = await transporter.sendMail({
    from: 'Tesla Supercharger <test@tesla.local>',
    to: 'driver@tesla.local',
    subject: 'Test',
    text: 'plain',
    html: '<p>html</p>',
  });

  if (!result.messageId) {
    throw new Error('sendMail did not return messageId');
  }

  console.log('email flow test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
