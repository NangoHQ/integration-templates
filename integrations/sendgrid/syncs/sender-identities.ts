import { createSync } from 'nango';
import { z } from 'zod';

const ProviderSenderIdentitySchema = z.object({
    id: z.number(),
    nickname: z.string().optional(),
    from_email: z.string().optional(),
    from_name: z.string().optional(),
    reply_to: z.string().optional(),
    reply_to_name: z.string().optional(),
    address: z.string().optional(),
    address2: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    verified: z.boolean().optional(),
    locked: z.boolean().optional()
});

const SenderIdentitySchema = z.object({
    id: z.string(),
    nickname: z.string().optional(),
    from_email: z.string().optional(),
    from_name: z.string().optional(),
    reply_to: z.string().optional(),
    reply_to_name: z.string().optional(),
    address: z.string().optional(),
    address2: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    verified: z.boolean().optional(),
    locked: z.boolean().optional()
});

const ResponseSchema = z.object({
    results: z.array(ProviderSenderIdentitySchema)
});

const CheckpointSchema = z.object({
    last_seen_id: z.number()
});

const sync = createSync({
    description: 'Sync verified sender identities.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        SenderIdentity: SenderIdentitySchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes GET /v3/verified_senders with no changed-since filter
        // and no deleted-record endpoint, so full refresh with delete tracking is appropriate.
        // Pagination uses limit + lastSeenID; we checkpoint the last seen ID to resume across runs.

        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        let lastSeenId: number | undefined = parsedCheckpoint.success ? parsedCheckpoint.data.last_seen_id : undefined;

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('SenderIdentity');

        while (true) {
            // https://www.twilio.com/docs/sendgrid/api-reference/sender-verification/get-all-verified-senders
            const response = await nango.get({
                endpoint: '/v3/verified_senders',
                params: {
                    limit: 100,
                    ...(lastSeenId !== undefined && { lastSeenID: lastSeenId })
                },
                retries: 3
            });

            const parsed = ResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse verified senders response: ${parsed.error.message}`);
            }

            const results = parsed.data.results;

            if (results.length === 0) {
                break;
            }

            const identities = results.map((sender) => ({
                id: String(sender.id),
                ...(sender.nickname !== undefined && { nickname: sender.nickname }),
                ...(sender.from_email !== undefined && { from_email: sender.from_email }),
                ...(sender.from_name !== undefined && { from_name: sender.from_name }),
                ...(sender.reply_to !== undefined && { reply_to: sender.reply_to }),
                ...(sender.reply_to_name !== undefined && { reply_to_name: sender.reply_to_name }),
                ...(sender.address !== undefined && { address: sender.address }),
                ...(sender.address2 !== undefined && { address2: sender.address2 }),
                ...(sender.state !== undefined && { state: sender.state }),
                ...(sender.city !== undefined && { city: sender.city }),
                ...(sender.zip !== undefined && { zip: sender.zip }),
                ...(sender.country !== undefined && { country: sender.country }),
                ...(sender.verified !== undefined && { verified: sender.verified }),
                ...(sender.locked !== undefined && { locked: sender.locked })
            }));

            await nango.batchSave(identities, 'SenderIdentity');

            const lastResult = results.at(-1);
            if (lastResult === undefined) {
                throw new Error('Unexpected empty results after length check');
            }

            lastSeenId = lastResult.id;
            await nango.saveCheckpoint({ last_seen_id: lastSeenId });

            if (results.length < 100) {
                break;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('SenderIdentity');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
