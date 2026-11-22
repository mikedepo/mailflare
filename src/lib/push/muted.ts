/**
 * Inboxes whose new mail sends no push notification, from `PUSH_MUTED_ADDRESSES`: addresses separated
 * by commas or whitespace, matched without regard to case. Mail to them is still delivered and still
 * shows in the app as it arrives; only the Web Push and native push alerts are skipped. Meant for
 * inboxes that receive machine mail, such as DMARC reports.
 */
export function parseMutedAddresses(value: string | undefined): Set<string> {
	const addresses = new Set<string>();
	for (const entry of (value ?? "").split(/[\s,]+/)) {
		const address = entry.trim().toLowerCase();
		if (address.includes("@")) addresses.add(address);
	}
	return addresses;
}

export function isPushMuted(value: string | undefined, address: string): boolean {
	return parseMutedAddresses(value).has(address.trim().toLowerCase());
}
