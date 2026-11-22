import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { isPushMuted, parseMutedAddresses } from "../src/lib/push/muted.ts";

// PUSH_MUTED_ADDRESSES lists inboxes (DMARC reports, say) whose new mail must not buzz a phone.
// The mail is still delivered and still updates open tabs; only Web Push and native push are skipped.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("the list takes commas or whitespace and ignores case and empty entries", () => {
	assert.deepEqual(
		[...parseMutedAddresses(" DMARC@avgsoft.ca, dmarc@avoina.com\n reports@example.org,, ")],
		["dmarc@avgsoft.ca", "dmarc@avoina.com", "reports@example.org"],
	);
	assert.equal(parseMutedAddresses(undefined).size, 0);
	assert.equal(parseMutedAddresses("").size, 0);
	assert.equal(parseMutedAddresses("not-an-address").size, 0);
});

test("only a listed inbox is muted", () => {
	const list = "dmarc@avgsoft.ca,dmarc@avoina.com";
	assert.equal(isPushMuted(list, "Dmarc@AvgSoft.ca"), true);
	assert.equal(isPushMuted(list, "dmarc@avoina.com"), true);
	assert.equal(isPushMuted(list, "mike@avgsoft.ca"), false);
	assert.equal(isPushMuted(list, "dmarc@example.com"), false);
	assert.equal(isPushMuted(undefined, "dmarc@avgsoft.ca"), false);
});

test("inbound delivery asks whether the inbox is muted before pushing", () => {
	const inbound = read("src/lib/email/inbound.ts");
	assert.match(inbound, /push: !isPushMuted\(env\.PUSH_MUTED_ADDRESSES, inboxAddress\)/);
	const realtime = read("src/lib/realtime/utils.ts");
	assert.match(realtime, /options\.push === false \? \[\] : \[sendPushNotifications\(/, "a muted inbox must skip both pushes");
});

test("the Node runtime passes PUSH_MUTED_ADDRESSES to the app", () => {
	assert.match(read("server/runtime/env.ts"), /PUSH_MUTED_ADDRESSES: optional\("PUSH_MUTED_ADDRESSES"\)/);
});
