import type { AppDatabase } from "@/db";
import { ALL_FEATURES } from "@/lib/features/service";

export async function isTeamMailboxSharingEnabled(_db: AppDatabase): Promise<boolean> {
    return ALL_FEATURES.canShareMailboxes;
}
