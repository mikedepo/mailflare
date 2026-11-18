import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// When the provider refuses a "Send now" (an SES sandbox recipient, for instance), deliverEmail
// has already marked the message failed. The composer treats any 5xx as "maybe still queued",
// polls, and then shows only a generic "Send failed", so the reason never reached the sender,
// and the route logged nothing either.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Only comments that start a line: a /* or // inside a string (a URL, say) stays code.
const stripComments = (src) => src.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, "").replace(/^[ \t]*\/\/.*$/gm, "");

function catchBlock() {
	const src = stripComments(readFileSync(join(root, "src/app/api/messages/[messageId]/send-now/route.ts"), "utf8"));
	const start = src.indexOf("} catch (");
	assert.notEqual(start, -1, "the send-now route must catch delivery errors");
	return src.slice(start);
}

test("send-now logs a delivery error", () => {
	assert.match(catchBlock(), /console\.error\(/, "a failed send-now must reach the server log");
});

test("send-now answers a final provider refusal with a 4xx the composer shows", () => {
	assert.match(catchBlock(), /status === "failed" \? 4\d\d : 500/, "a message already marked failed must get a 4xx, not 500");
});
