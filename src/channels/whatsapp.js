/**
 * WhatsApp channel — sends via the WhatsApp Cloud API (Meta).
 * Uses global fetch (Node 18+), no extra dependency required.
 */
function createWhatsAppChannel(config = {}) {
  const { phoneNumberId, accessToken, apiVersion = "v21.0" } = config;

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      "createWhatsAppChannel requires { phoneNumberId, accessToken } from your Meta app"
    );
  }

  const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  return {
    name: "whatsapp",

    /**
     * @param {{ to: string, text: string }} message
     *   `to` is the recipient's number in international format, no "+"
     *   or spaces, e.g. "919990230743".
     */
    async send(message) {
      if (!message.to) throw new Error('WhatsApp message requires "to"');
      if (!message.text) throw new Error('WhatsApp message requires "text"');

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.to,
          type: "text",
          text: { body: message.text },
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        const errorMessage = body?.error?.message || response.statusText;
        throw new Error(`WhatsApp send failed: ${errorMessage}`);
      }

      return { channel: "whatsapp", id: body.messages?.[0]?.id };
    },
  };
}

module.exports = { createWhatsAppChannel };
