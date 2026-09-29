# nimu-notify

A small Email + WhatsApp notification dispatcher for Node.js. One API
for both channels, `{{variable}}` templates, and built-in retries —
so a project doesn't reinvent "send an order confirmation" every time.

## Install

```bash
npm install nimu-notify
# email channel needs nodemailer as a peer dependency
npm install nodemailer
```

(Not published to npm yet — for now, clone this repo or copy the
`src/` folder into your project.)

## Quick start

```js
const {
  createNotifier,
  createEmailChannel,
  createWhatsAppChannel,
} = require("nimu-notify");

const notifier = createNotifier({
  channels: [
    createEmailChannel({
      host: "smtp.gmail.com",
      port: 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      from: "info@nimutechnologies.com",
    }),
    createWhatsAppChannel({
      phoneNumberId: process.env.WA_PHONE_NUMBER_ID,
      accessToken: process.env.WA_ACCESS_TOKEN,
    }),
  ],
  retries: 2,       // retry a failed send this many times
  retryDelayMs: 1000,
});

// Send on one channel
await notifier.send("email", {
  to: "client@example.com",
  subject: "Your order shipped",
  text: "Order #1234 is on its way.",
});

// Send on multiple channels at once — failures on one don't block the other
const { ok, errors } = await notifier.sendMany({
  email: { to: "client@example.com", subject: "Order shipped", text: "..." },
  whatsapp: { to: "919990230743", text: "Your order #1234 has shipped!" },
});
```

## Templates

Fill a message body from data without a templating dependency:

```js
const { render } = require("nimu-notify");

const text = render("Hi {{name}}, your order {{orderId}} has shipped.", {
  name: "Asha",
  orderId: "1234",
});
// "Hi Asha, your order 1234 has shipped."

await notifier.send("whatsapp", { to: "919990230743", text });
```

Missing variables render as an empty string rather than throwing, so a
template typo doesn't crash a send in production.

## Channels

### Email (`createEmailChannel`)

Wraps [nodemailer](https://nodemailer.com). Config:

| Option | Required | Notes |
|---|---|---|
| `host` | yes | SMTP host |
| `port` | no | defaults to `587` |
| `secure` | no | defaults to `false` |
| `auth` | yes | `{ user, pass }` |
| `from` | no | defaults to `auth.user` |

### WhatsApp (`createWhatsAppChannel`)

Uses the [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
directly via `fetch` — no extra dependency. Config:

| Option | Required | Notes |
|---|---|---|
| `phoneNumberId` | yes | from your Meta app |
| `accessToken` | yes | from your Meta app |
| `apiVersion` | no | defaults to `v21.0` |

`to` should be the recipient's number in international format with no
`+` or spaces, e.g. `"919990230743"`.

### Writing a custom channel

Any object with `{ name, send(message) }` works — SMS, Slack, push
notifications, whatever a project needs:

```js
const smsChannel = {
  name: "sms",
  async send(message) {
    // call your SMS provider here
    return { channel: "sms", id: "..." };
  },
};

const notifier = createNotifier({ channels: [smsChannel, ...] });
```

## Retries

`createNotifier({ retries, retryDelayMs })` applies to every `send()`
and `sendMany()` call — a transient failure (rate limit, network blip)
retries automatically before giving up.

## Running tests

```bash
npm test
```

Tests use mock channels — no real email or WhatsApp calls are made.
Uses Node's built-in test runner, no extra dependencies.

## License

MIT
