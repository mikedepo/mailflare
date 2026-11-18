import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// On Node, getEnv() returns the object createNodeRuntime builds (server/runtime/env.ts), not process.env.
// A variable the app reads as env.X but that object leaves out is silently undefined on Docker,
// while it works on Workers, where every var and secret is on env.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Only comments that start a line: a /* or // inside a string (an ARN such as arn:aws:s3:::bucket/*, a URL) stays code.
const stripComments = (src) => src.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, "").replace(/^[ \t]*\/\/.*$/gm, "");

// Workers-only bindings: Node reaches the database through DATABASE_URL instead.
const WORKERS_ONLY = new Set(["HYPERDRIVE", "DB_PRIMARY"]);

function sourceFiles(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		return /\.(ts|tsx|mjs|js)$/.test(entry.name) ? [path] : [];
	});
}

function nodeEnvKeys() {
	const src = stripComments(readFileSync(join(root, "server/runtime/env.ts"), "utf8"));
	const start = src.indexOf("const env = {");
	assert.notEqual(start, -1, "server/runtime/env.ts must build `const env = { ... }`");
	return new Set([...src.slice(start).matchAll(/^\s+([A-Z][A-Z0-9_]+):/gm)].map((match) => match[1]));
}

test("every env.X / vars.X the app reads is passed by the Node runtime", () => {
	const keys = nodeEnvKeys();
	const missing = new Map();
	for (const file of sourceFiles(join(root, "src"))) {
		const src = stripComments(readFileSync(file, "utf8"));
		for (const match of src.matchAll(/(?<![\w.$])(?:env|vars)\.([A-Z][A-Z0-9_]{2,})\b/g)) {
			const name = match[1];
			if (keys.has(name) || WORKERS_ONLY.has(name) || missing.has(name)) continue;
			missing.set(name, relative(root, file));
		}
	}
	assert.deepEqual(
		[...missing].map(([name, file]) => `${name} (${file})`),
		[],
		"add these to the env object in server/runtime/env.ts",
	);
});

test("the SES credentials and sending options reach the app on Node", () => {
	const keys = nodeEnvKeys();
	for (const name of ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "AWS_SES_CONFIGURATION_SET", "AWS_SES_TENANT_NAME", "INBOUND_REQUIRE_SIGNED_HEADERS"]) {
		assert.ok(keys.has(name), `${name} must be in the Node env object`);
	}
});
