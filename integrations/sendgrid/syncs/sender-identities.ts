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

const sync = createSync({
    description: 'Sync verified sender identities.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        SenderIdentity: SenderIdentitySchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes GET /v3/verified_senders with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor. The resource is small and
        // slowly-changing, so full refresh with delete tracking is appropriate.
        await nango.trackDeletesStart('SenderIdentity');

        // https://docs.sendgrid.com/api-reference/sender-verification/get-all-verified-senders
        const response = await nango.get({
            endpoint: '/v3/verified_senders',
            retries: 3
        });

        const parsed = ResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse verified senders response: ${parsed.error.message}`);
        }

        const identities = parsed.data.results.map((sender) => ({
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

        if (identities.length > 0) {
            await nango.batchSave(identities, 'SenderIdentity');
        }

        await nango.trackDeletesEnd('SenderIdentity');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
