import { createSync } from 'nango';
import { z } from 'zod';

const DEFAULT_BACKFILL_MS = 365 * 24 * 60 * 60 * 1000;
const DEFAULT_BACKFILL_DAYS = 14;
const BATCH_SIZE = 100;

const MetadataSchema = z.object({
    backfillPeriodMs: z.number().optional(),
    lastSyncBackfillPeriod: z.number().optional(),
    callIds: z.array(z.string()).optional(),
    workspaceId: z.string().optional()
});

const SentenceSchema = z.object({
    start: z.number().optional(),
    end: z.number().optional(),
    text: z.string().optional()
});

const MonologueSchema = z.object({
    speakerId: z.string().optional(),
    topic: z.string().optional(),
    sentences: z.array(SentenceSchema).optional()
});

const ProviderCallTranscriptSchema = z.object({
    callId: z.string().optional(),
    transcript: z.array(MonologueSchema).optional()
});

const RecordsSchema = z.object({
    totalRecords: z.number().optional(),
    currentPageSize: z.number().optional(),
    currentPageNumber: z.number().optional(),
    cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    records: RecordsSchema.optional(),
    callTranscripts: z.array(ProviderCallTranscriptSchema).optional()
});

const CallTranscriptSchema = z.object({
    id: z.string(),
    callId: z.string(),
    transcript: z
        .array(
            z.object({
                speakerId: z.string().optional(),
                topic: z.string().optional(),
                sentences: z
                    .array(
                        z.object({
                            start: z.number().optional(),
                            end: z.number().optional(),
                            text: z.string().optional()
                        })
                    )
                    .optional()
            })
        )
        .optional()
});

const CheckpointSchema = z.object({
    fromDateTime: z.string(),
    toDateTime: z.string(),
    cursor: z.string()
});

function isHttpErrorWithStatus(error: unknown, status: number): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    if ('status' in error && error.status === status) {
        return true;
    }
    if (!('response' in error)) {
        return false;
    }
    const response = error.response;
    if (typeof response !== 'object' || response === null) {
        return false;
    }
    if (!('status' in response)) {
        return false;
    }
    return response.status === status;
}

function getWindowEnd(): string {
    const now = new Date();
    now.setUTCSeconds(0, 0);
    now.setUTCMinutes(Math.floor(now.getUTCMinutes() / 5) * 5);
    return now.toISOString();
}

const sync = createSync({
    description: 'Sync call transcripts from Gong',
    version: '4.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/call-transcripts'
        }
    ],
    models: {
        CallTranscript: CallTranscriptSchema
    },
    metadata: MetadataSchema,

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const checkpoint = await nango.getCheckpoint();
        const savedFromDateTime =
            checkpoint && typeof checkpoint['fromDateTime'] === 'string' && checkpoint['fromDateTime'] !== '' ? checkpoint['fromDateTime'] : undefined;
        const savedToDateTime =
            checkpoint && typeof checkpoint['toDateTime'] === 'string' && checkpoint['toDateTime'] !== '' ? checkpoint['toDateTime'] : undefined;
        const savedCursor = checkpoint && typeof checkpoint['cursor'] === 'string' && checkpoint['cursor'] !== '' ? checkpoint['cursor'] : undefined;

        const toDateTime = savedToDateTime ?? getWindowEnd();
        let fromDateTime: string;

        if (savedFromDateTime && savedToDateTime) {
            // Mid-window resume: use exact saved values to stay consistent with the in-progress cursor
            fromDateTime = savedFromDateTime;
        } else if (savedFromDateTime) {
            // Starting a new window after completing the previous one: overlap by lastSyncBackfillPeriod
            // days to catch transcripts that were processed after the call ended
            const backfillDays = metadata?.lastSyncBackfillPeriod ?? DEFAULT_BACKFILL_DAYS;
            fromDateTime = new Date(new Date(savedFromDateTime).getTime() - backfillDays * 24 * 60 * 60 * 1000).toISOString();
        } else {
            // First run: limit initial backfill via metadata instead of fetching all history
            const backfillMs = metadata?.backfillPeriodMs ?? DEFAULT_BACKFILL_MS;
            fromDateTime = new Date(Date.now() - backfillMs).toISOString();
        }

        await nango.log(`Fetching Gong call transcripts from ${fromDateTime} to ${toDateTime}`);

        let cursor = savedCursor;

        // Keep the transcript window stable across retries so a saved cursor can
        // resume the same incremental slice instead of restarting it.
        while (true) {
            const filter: Record<string, unknown> = {
                fromDateTime,
                toDateTime,
                ...(metadata?.callIds && metadata.callIds.length > 0 && { callIds: metadata.callIds }),
                ...(metadata?.workspaceId && { workspaceId: metadata.workspaceId })
            };

            const body: Record<string, unknown> = {
                filter,
                ...(cursor && { cursor })
            };

            let response;
            // @allowTryCatch The API returns 404 with "No calls found" when there are no matching transcripts.
            try {
                // https://app.gong.io/settings/api/documentation#post-/v2/calls/transcript
                response = await nango.post({
                    endpoint: '/v2/calls/transcript',
                    data: body,
                    retries: 3
                });
            } catch (error) {
                if (isHttpErrorWithStatus(error, 404)) {
                    await nango.saveCheckpoint({ fromDateTime: toDateTime, toDateTime: '', cursor: '' });
                    return;
                }
                throw error;
            }

            const parsed = ProviderResponseSchema.parse(response.data);
            const transcripts = parsed.callTranscripts ?? [];

            // Process transcripts in batches of BATCH_SIZE
            for (let i = 0; i < transcripts.length; i += BATCH_SIZE) {
                const batch = transcripts.slice(i, i + BATCH_SIZE);
                await nango.log(`Processing batch of ${batch.length} transcripts...`);

                const records: z.infer<typeof CallTranscriptSchema>[] = [];
                for (const item of batch) {
                    if (typeof item.callId !== 'string' || item.callId.length === 0) {
                        continue;
                    }
                    records.push({
                        id: item.callId,
                        callId: item.callId,
                        transcript: (item.transcript ?? []).map((monologue) => ({
                            speakerId: monologue.speakerId,
                            topic: monologue.topic,
                            sentences: (monologue.sentences ?? []).map((sentence) => ({
                                start: sentence.start,
                                end: sentence.end,
                                text: sentence.text
                            }))
                        }))
                    });
                }

                if (records.length > 0) {
                    await nango.batchSave(records, 'CallTranscript');
                }
            }

            const nextCursor = parsed.records?.cursor;
            if (!nextCursor) {
                await nango.saveCheckpoint({ fromDateTime: toDateTime, toDateTime: '', cursor: '' });
                return;
            }

            cursor = nextCursor;
            await nango.saveCheckpoint({ fromDateTime, toDateTime, cursor });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
