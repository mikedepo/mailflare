import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// SNS posts the SubscriptionConfirmation as soon as Subscribe returns. /api/inbound/ses answers 403
// until the receiving state (token, topic) is saved, so Setup must save it before subscribing.
// Otherwise the first confirmation is refused and the subscription stays pending.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Only comments that start a line: a /* or // inside a string (an ARN such as arn:aws:s3:::bucket/*, a URL) stays code.
const stripComments = (src) => src.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, "").replace(/^[ \t]*\/\/.*$/gm, "");

function setupBody() {
	const src = stripComments(readFileSync(join(root, "src/lib/aws/ses-receiving.ts"), "utf8"));
	const start = src.indexOf("export async function setupSesReceiving(");
	assert.notEqual(start, -1, "setupSesReceiving must exist");
	const end = src.indexOf("\nexport ", start + 1);
	return src.slice(start, end === -1 ? undefined : end);
}

test("setupSesReceiving saves the token and topic before it subscribes", () => {
	const body = setupBody();
	const save = body.indexOf("saveState(");
	const subscribe = body.indexOf("subscribeHttps(");
	assert.notEqual(subscribe, -1, "setupSesReceiving must call subscribeHttps");
	assert.ok(save !== -1 && save < subscribe, "saveState(env, state) must run before subscribeHttps(...)");
	assert.ok(body.indexOf("state.topicArn = ") < save, "the topic ARN must be known when the state is saved");
});

test("setupSesReceiving subscribes again while the subscription is pending", () => {
	const body = setupBody();
	assert.match(body, /if \(!\w+\?\.confirmed\) await subscribeHttps\(/, "a pending (unconfirmed) subscription must be subscribed again");
});
