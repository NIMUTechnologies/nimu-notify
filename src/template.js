/**
 * render(template, data)
 *
 * Minimal {{variable}} substitution — no dependency, no logic,
 * just enough for "Hi {{name}}, your order {{orderId}} shipped."
 * Missing keys are left as an empty string rather than throwing,
 * so a template typo doesn't crash a send.
 */
function render(template, data = {}) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(data, key) ? String(data[key]) : ""
  );
}

module.exports = { render };
