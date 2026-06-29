import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    direction: z.enum(['inbound', 'outbound']).optional(),
    qualified: z.boolean().optional()
});

const CheckpointSchema = z.object({
    last_synced_to: z.number(),
    window_to: z.number(),
    page: z.number().int().positive()
});

const ProviderCallSchema = z
    .object({
        id: z.number(),
        sid: z.string().optional().nullable(),
        direct_link: z.string().optional().nullable(),
        direction: z.enum(['inbound', 'outbound']),
        status: z.enum(['initial', 'answered', 'done']),
        duration: z.number(),
        raw_digits: z.string(),
        started_at: z.string(),
        answered_at: z.string().optional().nullable(),
        ended_at: z.string().optional().nullable(),
        archived: z.boolean().optional().nullable(),
        missed_call_reason: z.string().optional().nullable(),
        recording: z.string().optional().nullable(),
        voicemail: z.string().optional().nullable(),
        asset: z.string().optional().nullable(),
        number: z.object({ id: z.number() }).optional().nullable(),
        user: z.object({ id: z.number() }).optional().nullable(),
        contact: z.object({ id: z.number() }).optional().nullable()
    })
    .passthrough();

const ProviderCallsPageSchema = z.object({
    calls: z.array(ProviderCallSchema),
    meta: z
        .object({
            next_page_link: z.string().nullable().optional()
        })
        .passthrough()
});

const CallSchema = z.object({
    id: z.string(),
    sid: z.string().optional(),
    direct_link: z.string().optional(),
    direction: z.string(),
    status: z.string(),
    duration: z.number(),
    raw_digits: z.string(),
    started_at: z.string(),
    answered_at: z.string().optional(),
    ended_at: z.string().optional(),
    archived: z.boolean().optional(),
    missed_call_reason: z.string().optional(),
    recording: z.string().optional(),
    voicemail: z.string().optional(),
    asset: z.string().optional(),
    number_id: z.number().optional(),
    user_id: z.number().optional(),
    contact_id: z.number().optional()
});

const sync = createSync({
    description: 'Sync calls from Aircall',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Call: CallSchema
    },
    endpoints: [
        // https://developer.aircall.io/api-references/#list-all-calls
        {
            path: '/syncs/calls',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const metadataParse = MetadataSchema.safeParse(await nango.getMetadata());
        if (!metadataParse.success) {
            throw new Error(`Invalid metadata: ${metadataParse.error.message}`);
        }
        const metadata = metadataParse.data;

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointParse = rawCheckpoint == null ? null : CheckpointSchema.safeParse(rawCheckpoint);
        if (checkpointParse != null && !checkpointParse.success) {
            throw new Error(`Invalid checkpoint: ${checkpointParse.error.message}`);
        }

        const checkpoint = checkpointParse?.data;
        const hasCommittedCheckpoint = checkpoint != null;
        const from = checkpoint?.last_synced_to;
        const isResumingWindow = checkpoint != null && (checkpoint.page > 1 || checkpoint.window_to > checkpoint.last_synced_to);
        const to = isResumingWindow ? checkpoint.window_to : Math.floor(Date.now() / 1000);
        const perPage = 50;
        let currentPage = isResumingWindow ? checkpoint.page : 1;

        const params: Record<string, string | number> = {
            per_page: perPage,
            ...(hasCommittedCheckpoint && { to }),
            ...(from !== undefined && { from }),
            ...(metadata.direction !== undefined && { direction: metadata.direction }),
            ...(metadata.qualified !== undefined && { qualified: metadata.qualified ? 'true' : 'false' })
        };

        const saveInProgressCheckpoint = async (page: number) => {
            if (from === undefined) {
                return;
            }

            await nango.saveCheckpoint({
                last_synced_to: from,
                window_to: to,
                page
            });
        };

        while (true) {
            const response = await nango.get<z.infer<typeof ProviderCallsPageSchema>>({
                // https://developer.aircall.io/api-references/#list-all-calls
                endpoint: '/v1/calls',
                params: {
                    ...params,
                    page: currentPage
                },
                retries: 3
            });

            const pageParse = ProviderCallsPageSchema.safeParse(response.data);
            if (!pageParse.success) {
                throw new Error(`Failed to parse calls page: ${pageParse.error.message}`);
            }

            const calls = [];
            for (const call of pageParse.data.calls) {
                const mapped = {
                    id: String(call.id),
                    ...(call.sid != null && { sid: call.sid }),
                    ...(call.direct_link != null && { direct_link: call.direct_link }),
                    direction: call.direction,
                    status: call.status,
                    duration: call.duration,
                    raw_digits: call.raw_digits,
                    started_at: call.started_at,
                    ...(call.answered_at != null && { answered_at: call.answered_at }),
                    ...(call.ended_at != null && { ended_at: call.ended_at }),
                    ...(call.archived != null && { archived: call.archived }),
                    ...(call.missed_call_reason != null && { missed_call_reason: call.missed_call_reason }),
                    ...(call.recording != null && { recording: call.recording }),
                    ...(call.voicemail != null && { voicemail: call.voicemail }),
                    ...(call.asset != null && { asset: call.asset }),
                    ...(call.number != null && { number_id: call.number.id }),
                    ...(call.user != null && { user_id: call.user.id }),
                    ...(call.contact != null && { contact_id: call.contact.id })
                };
                const mappedParse = CallSchema.safeParse(mapped);
                if (!mappedParse.success) {
                    throw new Error(`Failed to validate mapped call: ${mappedParse.error.message}`);
                }
                calls.push(mappedParse.data);
            }

            if (calls.length > 0) {
                await nango.batchSave(calls, 'Call');
            }

            if (pageParse.data.meta.next_page_link == null || pageParse.data.calls.length < perPage) {
                await nango.saveCheckpoint({ last_synced_to: to, window_to: to, page: 1 });
                break;
            }

            currentPage += 1;
            await saveInProgressCheckpoint(currentPage);
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
