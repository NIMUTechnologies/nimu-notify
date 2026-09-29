/**
 * Email channel — thin wrapper so callers don't touch nodemailer directly.
 *
 * Requires "nodemailer" as a peer dependency (not bundled), so projects
 * that only use the WhatsApp channel don't have to install it.
 */
function createEmailChannel(config = {}) {
  const { host, port = 587, secure = false, auth, from } = config;

  if (!host || !auth) {
    throw new Error(
      "createEmailChannel requires at least { host, auth: { user, pass } }"
    );
  }

  let transporter;

  function getTransporter() {
    if (transporter) return transporter;
    let nodemailer;
    try {
      nodemailer = require("nodemailer");
    } catch {
      throw new Error(
        'Email channel needs "nodemailer" installed: npm install nodemailer'
      );
    }
    transporter = nodemailer.createTransport({ host, port, secure, auth });
    return transporter;
  }

  return {
    name: "email",

    /**
     * @param {{ to: string, subject: string, text?: string, html?: string }} message
     */
    async send(message) {
      if (!message.to) throw new Error('Email message requires "to"');
      if (!message.subject) throw new Error('Email message requires "subject"');
      if (!message.text && !message.html) {
        throw new Error('Email message requires "text" or "html"');
      }

      const info = await getTransporter().sendMail({
        from: from || auth.user,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      return { channel: "email", id: info.messageId, accepted: info.accepted };
    },
  };
}

module.exports = { createEmailChannel };
