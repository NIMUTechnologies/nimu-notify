const test = require("node:test");
const assert = require("node:assert");
const { createNotifier, render } = require("../src/index");

function mockChannel(name, { failTimes = 0 } = {}) {
  let calls = 0;
  let failuresLeft = failTimes;
  return {
    name,
    calls: 0,
    sent: [],
    async send(message) {
      calls++;
      mockChannel.callsFor = mockChannel.callsFor || {};
      if (failuresLeft > 0) {
        failuresLeft--;
        throw new Error(`${name} temporarily unavailable`);
      }
      return { channel: name, id: `mock-${calls}` };
    },
  };
}

test("render() substitutes known variables", () => {
  const result = render("Hi {{name}}, order {{id}} shipped.", {
    name: "Asha",
    id: "1234",
  });
  assert.strictEqual(result, "Hi Asha, order 1234 shipped.");
});

test("render() leaves missing variables blank instead of throwing", () => {
  const result = render("Hi {{name}}!", {});
  assert.strictEqual(result, "Hi !");
});

test("send() dispatches to the named channel", async () => {
  const email = mockChannel("email");
  const notifier = createNotifier({ channels: [email] });

  const result = await notifier.send("email", { to: "a@x.com" });
  assert.strictEqual(result.channel, "email");
});

test("send() throws a clear error for an unknown channel", async () => {
  const notifier = createNotifier({ channels: [mockChannel("email")] });

  await assert.rejects(
    () => notifier.send("sms", {}),
    /Unknown channel "sms"/
  );
});

test("send() retries the configured number of times before succeeding", async () => {
  const flaky = mockChannel("email", { failTimes: 2 });
  const notifier = createNotifier({
    channels: [flaky],
    retries: 2,
    retryDelayMs: 1,
  });

  const result = await notifier.send("email", { to: "a@x.com" });
  assert.strictEqual(result.channel, "email");
});

test("sendMany() reports both successes and failures without throwing", async () => {
  const email = mockChannel("email");
  const whatsapp = mockChannel("whatsapp", { failTimes: 99 });
  const notifier = createNotifier({ channels: [email, whatsapp] });

  const result = await notifier.sendMany({
    email: { to: "a@x.com" },
    whatsapp: { to: "919990230743" },
  });

  assert.strictEqual(result.ok.length, 1);
  assert.strictEqual(result.errors.length, 1);
  assert.strictEqual(result.errors[0].channel, "whatsapp");
});
