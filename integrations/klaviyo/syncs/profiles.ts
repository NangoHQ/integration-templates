import { createSync } from 'nango';
import { z } from 'zod';

const ProfileSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    phone_number: z.string().optional(),
    external_id: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional()
});

const CheckpointSchema = z.object({
    state: z.string()
});

const CheckpointStateSchema = z.object({
    updated_after: z.string().optional(),
    cursor: z.string().optional()
});

const KlaviyoProfileAttributesSchema = z.object({
    email: z.string().nullable().optional(),
    phone_number: z.string().nullable().optional(),
    external_id: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    created: z.string().nullable().optional(),
    updated: z.string().nullable().optional()
});

const KlaviyoProfileDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: KlaviyoProfileAttributesSchema
});

const KlaviyoListResponseSchema = z.object({
    data: z.array(KlaviyoProfileDataSchema),
    links: z
        .object({
            next: z.string().nullable().optional(),
            self: z.string().nullable().optional(),
            prev: z.string().nullable().optional()
        })
        .optional()
});

function shiftBackOneMillisecond(isoTimestamp: string): string {
    const shifted = new Date(new Date(isoTimestamp).getTime() - 1);
    return shifted.toISOString();
}

function extractCursor(nextUrl: string): string | undefined {
    // @allowTryCatch URL parsing may fail on malformed links from the provider
    try {
        const url = new URL(nextUrl);
        const cursor = url.searchParams.get('page[cursor]');
        return cursor ?? undefined;
    } catch {
        return undefined;
    }
}

const sync = createSync({
    description: 'Sync profiles.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Profile: ProfileSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        let state: z.infer<typeof CheckpointStateSchema> = {};
        if (checkpoint?.state) {
            let parsed: unknown;
            // @allowTryCatch JSON.parse may throw on corrupted checkpoint state
            try {
                parsed = JSON.parse(checkpoint.state);
            } catch {
                throw new Error('Failed to parse checkpoint state');
            }
            const validated = CheckpointStateSchema.safeParse(parsed);
            if (!validated.success) {
                throw new Error(`Invalid checkpoint state: ${validated.error.message}`);
            }
            state = validated.data;
        }

        const updatedAfter = state.updated_after;
        let cursor = state.cursor;
        const hasNext = true;

        while (hasNext) {
            const params: Record<string, string | number> = {
                sort: 'updated'
            };

            if (updatedAfter) {
                // The profiles API only supports strict greater-than on 'updated' (no greater-or-equal),
                // so shift the boundary back 1ms to avoid missing records with the exact checkpoint timestamp.
                params['filter'] = `greater-than(updated,${shiftBackOneMillisecond(updatedAfter)})`;
            }

            if (cursor) {
                params['page[cursor]'] = cursor;
            }

            // https://developers.klaviyo.com/en/reference/get_profiles
            const response = await nango.get({
                endpoint: '/api/profiles',
                params,
                headers: { revision: '2026-04-15' },
                retries: 3
            });

            const validated = KlaviyoListResponseSchema.safeParse(response.data);
            if (!validated.success) {
                throw new Error(`Invalid response from Klaviyo profiles API: ${validated.error.message}`);
            }

            const profiles = validated.data.data.map((item) => ({
                id: item.id,
                ...(item.attributes.email != null && { email: item.attributes.email }),
                ...(item.attributes.phone_number != null && { phone_number: item.attributes.phone_number }),
                ...(item.attributes.external_id != null && { external_id: item.attributes.external_id }),
                ...(item.attributes.first_name != null && { first_name: item.attributes.first_name }),
                ...(item.attributes.last_name != null && { last_name: item.attributes.last_name }),
                ...(item.attributes.created != null && { created: item.attributes.created }),
                ...(item.attributes.updated != null && { updated: item.attributes.updated })
            }));

            if (profiles.length > 0) {
                await nango.batchSave(profiles, 'Profile');
            }

            const nextUrl = validated.data.links?.next;
            if (!nextUrl) {
                const lastProfile = profiles.length > 0 ? profiles[profiles.length - 1] : undefined;
                const newUpdatedAfter = lastProfile?.updated ?? updatedAfter;
                const nextState: z.infer<typeof CheckpointStateSchema> = {};
                if (newUpdatedAfter) {
                    nextState.updated_after = newUpdatedAfter;
                }
                await nango.saveCheckpoint({ state: JSON.stringify(nextState) });
                break;
            }

            const nextCursor = extractCursor(nextUrl);
            if (!nextCursor) {
                throw new Error('Failed to extract cursor from next page URL');
            }

            cursor = nextCursor;
            const nextState: z.infer<typeof CheckpointStateSchema> = {};
            if (updatedAfter) {
                nextState.updated_after = updatedAfter;
            }
            nextState.cursor = cursor;
            await nango.saveCheckpoint({ state: JSON.stringify(nextState) });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
