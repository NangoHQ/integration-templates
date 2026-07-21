import { createSync } from 'nango';
import { z } from 'zod';

const MAX_RESULTS = 1000;

const ProviderMessageSchema = z.object({
    ts: z.number(),
    _id: z.string(),
    sender: z.string(),
    template: z.string().nullable(),
    subject: z.string(),
    email: z.string(),
    tags: z.array(z.string()).optional(),
    opens: z.number().optional(),
    clicks: z.number().optional(),
    state: z.string().optional(),
    metadata: z.unknown().optional()
});

const MessageSchema = z.object({
    id: z.string(),
    ts: z.number(),
    sender: z.string(),
    subject: z.string(),
    email: z.string(),
    state: z.string().optional(),
    tags: z.array(z.string()).optional(),
    opens: z.number().optional(),
    clicks: z.number().optional(),
    template: z.string().optional(),
    metadata: z.unknown().optional()
});

const CheckpointSchema = z.object({
    date_from: z.number()
});

function tsToIso(ts: number): string {
    return new Date(ts * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const sync = createSync({
    description: 'Sync recently sent transactional messages (activity log).',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Message: MessageSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const nowTs = Math.floor(Date.now() / 1000);
        const startTs = checkpoint?.date_from ?? nowTs - 7 * 24 * 60 * 60;
        const seenIds = new Set<string>();
        let maxTs = checkpoint?.date_from;

        const syncRange = async (from: number, to: number, useExplicitRange: boolean): Promise<void> => {
            if (from >= to) {
                return;
            }

            const requestData: Record<string, string | number> = {
                limit: MAX_RESULTS
            };

            if (useExplicitRange) {
                requestData['date_from'] = tsToIso(from);
                requestData['date_to'] = tsToIso(to);
            }

            const response = await nango.post({
                // https://mailchimp.com/developer/transactional/api/messages/search-messages-by-date/
                endpoint: '/1.0/messages/search.json',
                data: requestData,
                retries: 3
            });

            const parseResult = z.array(ProviderMessageSchema).safeParse(response.data);
            if (!parseResult.success) {
                throw new Error(`Failed to parse messages: ${parseResult.error.message}`);
            }

            const messages = parseResult.data;

            if (messages.length === MAX_RESULTS) {
                const mid = Math.floor((from + to) / 2);
                if (mid > from && mid < to) {
                    await syncRange(from, mid, true);
                    await syncRange(mid, to, true);
                    return;
                }
            }

            const toSave: Array<z.infer<typeof MessageSchema>> = [];
            let rangeMaxTs: number | undefined;

            for (const msg of messages) {
                if (seenIds.has(msg._id)) {
                    continue;
                }
                seenIds.add(msg._id);
                toSave.push({
                    id: msg._id,
                    ts: msg.ts,
                    sender: msg.sender,
                    subject: msg.subject,
                    email: msg.email,
                    ...(msg.state != null && { state: msg.state }),
                    ...(msg.tags != null && { tags: msg.tags }),
                    ...(msg.opens != null && { opens: msg.opens }),
                    ...(msg.clicks != null && { clicks: msg.clicks }),
                    ...(msg.template != null && { template: msg.template }),
                    ...(msg.metadata != null && { metadata: msg.metadata })
                });
                if (rangeMaxTs === undefined || msg.ts > rangeMaxTs) {
                    rangeMaxTs = msg.ts;
                }
            }

            if (toSave.length > 0) {
                await nango.batchSave(toSave, 'Message');
            }

            const nextDateFrom = rangeMaxTs ?? to;
            maxTs = maxTs === undefined ? nextDateFrom : Math.max(maxTs, nextDateFrom);
            await nango.saveCheckpoint({ date_from: maxTs });
        };

        await syncRange(startTs, nowTs, checkpoint != null);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
