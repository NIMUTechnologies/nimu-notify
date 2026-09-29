const { render } = require("./template");
const { createEmailChannel } = require("./channels/email");
const { createWhatsAppChannel } = require("./channels/whatsapp");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * createNotifier({ channels, retries, retryDelayMs })
 *
 * A thin dispatcher over one or more channels (email, whatsapp, ...).
 * Each channel is any object with { name, send(message) }, so a
 * custom channel (SMS, Slack, push) just needs the same shape.
 *
 * @param {object} options
 * @param {Array<{name: string, send: Function}>} options.channels
 * @param {number} [options.retries=0] - retry attempts on failure, per channel
 * @param {number} [options.retryDelayMs=1000] - delay between retries
 */
function createNotifier({ channels = [], retries = 0, retryDelayMs = 1000 } = {}) {
  const byName = new Map(channels.map((channel) => [channel.name, channel]));

  async function sendOnce(channelName, message) {
    const channel = byName.get(channelName);
    if (!channel) {
      throw new Error(
        `Unknown channel "${channelName}". Registered channels: ${[...byName.keys()].join(", ") || "(none)"}`
      );
    }
    return channel.send(message);
  }

  async function sendWithRetry(channelName, message) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await sendOnce(channelName, message);
      } catch (err) {
        lastError = err;
        if (attempt < retries) await wait(retryDelayMs);
      }
    }
    throw lastError;
  }

  return {
    /**
     * Send a message on one channel.
     * @param {string} channelName - "email" | "whatsapp" | custom
     * @param {object} message - shape depends on the channel
     */
    send(channelName, message) {
      return sendWithRetry(channelName, message);
    },

    /**
     * Send the same logical notification across multiple channels at
     * once. Each entry in `messages` is keyed by channel name; failures
     * on one channel don't block the others — check `.errors` on the
     * result for any that failed.
     *
     * @example
     * await notifier.sendMany({
     *   email: { to: "a@x.com", subject: "Order shipped", text: "..." },
     *   whatsapp: { to: "919990230743", text: "..." },
     * });
     */
    async sendMany(messages) {
      const entries = Object.entries(messages);
      const results = await Promise.allSettled(
        entries.map(([channelName, message]) => sendWithRetry(channelName, message))
      );

      const ok = [];
      const errors = [];
      results.forEach((result, i) => {
        const [channelName] = entries[i];
        if (result.status === "fulfilled") {
          ok.push(result.value);
        } else {
          errors.push({ channel: channelName, error: result.reason });
        }
      });

      return { ok, errors };
    },

    /** Fill a {{variable}} template with data — see src/template.js. */
    render,
  };
}

module.exports = { createNotifier, render, createEmailChannel, createWhatsAppChannel };
