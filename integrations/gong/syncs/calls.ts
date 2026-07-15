import { createSync } from 'nango';
import { z } from 'zod';

const DEFAULT_BACKFILL_MS = 365 * 24 * 60 * 60 * 1000;
const DEFAULT_BACKFILL_DAYS = 14;
const BATCH_SIZE = 100;

const MetadataSchema = z.object({
    backfillPeriodMs: z.number().optional(),
    lastSyncBackfillPeriod: z.number().optional()
});

const ProviderCallSchema = z.object({
    id: z.string(),
    url: z.string().nullish(),
    title: z.string().nullish(),
    scheduled: z.string().nullish(),
    started: z.string().nullish(),
    duration: z.number().nullish(),
    primaryUserId: z.string().nullish(),
    direction: z.string().nullish(),
    system: z.string().nullish(),
    scope: z.string().nullish(),
    media: z.string().nullish(),
    language: z.string().nullish(),
    workspaceId: z.string().nullish(),
    sdrDisposition: z.string().nullish(),
    clientUniqueId: z.string().nullish(),
    customData: z.string().nullish(),
    purpose: z.string().nullish(),
    meetingUrl: z.string().nullish(),
    isPrivate: z.boolean().nullish(),
    calendarEventId: z.string().nullish()
});

const ProviderListResponseSchema = z.object({
    requestId: z.string().optional(),
    records: z
        .object({
            totalRecords: z.number().nullish(),
            currentPageSize: z.number().nullish(),
            currentPageNumber: z.number().nullish(),
            cursor: z.string().nullish()
        })
        .nullish(),
    calls: z.array(z.unknown()).nullish()
});

const ProviderExtensiveCallSchema = z.object({
    metaData: z.object({}).passthrough().nullish(),
    context: z.array(z.object({}).passthrough()).nullish(),
    parties: z
        .array(
            z.object({
                id: z.string().nullable(),
                emailAddress: z.string().nullish(),
                name: z.string().nullish(),
                title: z.string().nullish(),
                userId: z.string().nullish(),
                speakerId: z.string().nullish(),
                affiliation: z.string().nullish(),
                methods: z.array(z.string()).nullish()
            })
        )
        .nullish(),
    interaction: z
        .object({
            speakers: z.array(z.object({ id: z.string().nullable(), userId: z.string().nullable(), talkTime: z.number().nullable() })).nullish(),
            interactionStats: z.array(z.object({ name: z.string().nullable(), value: z.number().nullable() })).nullish(),
            video: z.array(z.object({ name: z.string().nullable(), duration: z.number().nullable() })).nullish(),
            questions: z.object({ companyCount: z.number().nullish(), nonCompanyCount: z.number().nullish() }).nullish()
        })
        .nullish(),
    collaboration: z
        .object({
            publicComments: z
                .array(
                    z.object({
                        id: z.string().nullable(),
                        audioStartTime: z.number().nullable(),
                        audioEndTime: z.number().nullable(),
                        commenterUserId: z.string().nullable(),
                        comment: z.string().nullable(),
                        posted: z.string().nullable(),
                        duringCall: z.boolean().nullable()
                    })
                )
                .nullish()
        })
        .nullish(),
    media: z
        .object({
            audioUrl: z.string().nullish(),
            videoUrl: z.string().nullish()
        })
        .nullish()
});

const ProviderExtensiveResponseSchema = z.object({
    requestId: z.string().optional(),
    records: z.object({ cursor: z.string().nullish() }).nullish(),
    calls: z.array(ProviderExtensiveCallSchema).nullish()
});

const CallSchema = z.object({
    id: z.string(),
    url: z.string().nullish(),
    title: z.string().nullish(),
    scheduled: z.string().nullish(),
    started: z.string().nullish(),
    duration: z.number().nullish(),
    primaryUserId: z.string().nullish(),
    direction: z.string().nullish(),
    system: z.string().nullish(),
    scope: z.string().nullish(),
    media: z.string().nullish(),
    language: z.string().nullish(),
    workspaceId: z.string().nullish(),
    sdrDisposition: z.string().nullish(),
    clientUniqueId: z.string().nullish(),
    customData: z.string().nullish(),
    purpose: z.string().nullish(),
    meetingUrl: z.string().nullish(),
    isPrivate: z.boolean().nullish(),
    calendarEventId: z.string().nullish(),
    context: z.array(z.object({}).passthrough()).nullish(),
    parties: z
        .array(
            z.object({
                id: z.string().nullable(),
                emailAddress: z.string().nullish(),
                name: z.string().nullish(),
                title: z.string().nullish(),
                userId: z.string().nullish(),
                speakerId: z.string().nullish(),
                affiliation: z.string().nullish(),
                methods: z.array(z.string()).nullish()
            })
        )
        .nullish(),
    interaction: z
        .object({
            speakers: z.array(z.object({ id: z.string().nullable(), userId: z.string().nullable(), talkTime: z.number().nullable() })).nullish(),
            interactionStats: z.array(z.object({ name: z.string().nullable(), value: z.number().nullable() })).nullish(),
            video: z.array(z.object({ name: z.string().nullable(), duration: z.number().nullable() })).nullish(),
            questions: z.object({ companyCount: z.number().nullish(), nonCompanyCount: z.number().nullish() }).nullish()
        })
        .nullish(),
    collaboration: z
        .object({
            publicComments: z
                .array(
                    z.object({
                        id: z.string().nullable(),
                        audioStartTime: z.number().nullable(),
                        audioEndTime: z.number().nullable(),
                        commenterUserId: z.string().nullable(),
                        comment: z.string().nullable(),
                        posted: z.string().nullable(),
                        duringCall: z.boolean().nullable()
                    })
                )
                .nullish()
        })
        .nullish(),
    mediaUrls: z
        .object({
            audioUrl: z.string().nullish(),
            videoUrl: z.string().nullish()
        })
        .nullish()
});

const CheckpointSchema = z.object({
    fromDateTime: z.string(),
    toDateTime: z.string(),
    cursor: z.string()
});

// contentSelector passed to /v2/calls/extensive to request all available fields
const ExposedFieldsKeys = {
    parties: true,
    content: {
        structure: true,
        topics: true,
        trackers: true,
        trackerOccurrences: true,
        pointsOfInterest: true,
        brief: true,
        outline: true,
        highlights: true,
        callOutcome: true,
        keyPoints: true
    },
    interaction: {
        speakers: true,
        video: true,
        personInteractionStats: true,
        questions: true
    },
    collaboration: {
        publicComments: true
    },
    media: true
};

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
    return 'status' in response && response.status === status;
}

function getWindowEnd(): string {
    const now = new Date();
    now.setUTCSeconds(0, 0);
    now.setUTCMinutes(Math.floor(now.getUTCMinutes() / 5) * 5);
    return now.toISOString();
}

const sync = createSync({
    description: 'Sync calls from Gong.',
    version: '2.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/calls' }],
    models: {
        Call: CallSchema
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
            // days to catch calls that were updated after their scheduled time
            const backfillDays = metadata?.lastSyncBackfillPeriod ?? DEFAULT_BACKFILL_DAYS;
            fromDateTime = new Date(new Date(savedFromDateTime).getTime() - backfillDays * 24 * 60 * 60 * 1000).toISOString();
        } else {
            // First run: limit initial backfill via metadata instead of fetching all history
            const backfillMs = metadata?.backfillPeriodMs ?? DEFAULT_BACKFILL_MS;
            fromDateTime = new Date(Date.now() - backfillMs).toISOString();
        }

        await nango.log(`Fetching Gong calls from ${fromDateTime} to ${toDateTime}`);

        let cursor = savedCursor;

        // Keep the request window stable across resumed runs and save the cursor
        // after each page so an interrupted execution can continue mid-window.
        while (true) {
            let response;
            const params: Record<string, string> = { fromDateTime, toDateTime };
            if (cursor) {
                params['cursor'] = cursor;
            }

            // @allowTryCatch
            // Gong returns HTTP 404 with "No calls found" when the date range contains no calls.
            try {
                response = await nango.get({
                    // https://app.gong.io/settings/api/documentation#get-/v2/calls
                    endpoint: '/v2/calls',
                    params,
                    retries: 3
                });
            } catch (error) {
                if (isHttpErrorWithStatus(error, 404)) {
                    await nango.saveCheckpoint({ fromDateTime: toDateTime, toDateTime: '', cursor: '' });
                    return;
                }
                throw error;
            }

            const parsed = ProviderListResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse calls response: ${parsed.error.message}`);
            }

            const rawCalls = parsed.data.calls ?? [];
            const callIds: string[] = [];
            for (const record of rawCalls) {
                const callParsed = ProviderCallSchema.safeParse(record);
                if (!callParsed.success) {
                    throw new Error(`Failed to parse call: ${callParsed.error.message}`);
                }
                if (callParsed.data.id) {
                    callIds.push(callParsed.data.id);
                }
            }

            // Fetch extensive details in batches of BATCH_SIZE and save incrementally
            for (let i = 0; i < callIds.length; i += BATCH_SIZE) {
                const batchCallIds = callIds.slice(i, i + BATCH_SIZE);
                await nango.log(`Processing batch of ${batchCallIds.length} calls...`);

                const extensiveCalls = await fetchExtensiveDetails(nango, batchCallIds);
                const mapped = extensiveCalls.map(mapToCall);

                if (mapped.length > 0) {
                    await nango.batchSave(mapped, 'Call');
                }
            }

            const nextCursor = parsed.data.records?.cursor;
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

async function fetchExtensiveDetails(nango: NangoSyncLocal, callIds: string[]): Promise<NonNullable<z.infer<typeof ProviderExtensiveResponseSchema>['calls']>> {
    let cursor: string | undefined;
    const allCalls: NonNullable<z.infer<typeof ProviderExtensiveResponseSchema>['calls']> = [];

    while (true) {
        const response = await nango.post({
            // https://app.gong.io/settings/api/documentation#post-/v2/calls/extensive
            endpoint: '/v2/calls/extensive',
            data: {
                filter: { callIds },
                contentSelector: { exposedFields: ExposedFieldsKeys },
                ...(cursor && { cursor })
            },
            retries: 3
        });

        const parsed = ProviderExtensiveResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse extensive calls response: ${parsed.error.message}`);
        }

        allCalls.push(...(parsed.data.calls ?? []));

        const nextCursor = parsed.data.records?.cursor;
        if (!nextCursor) break;
        cursor = nextCursor;
    }

    return allCalls;
}

function mapToCall(extensive: z.infer<typeof ProviderExtensiveCallSchema>): z.infer<typeof CallSchema> {
    const meta = extensive.metaData;
    if (!meta?.['id'] || typeof meta['id'] !== 'string') {
        throw new Error('Extensive call is missing metaData.id');
    }

    return {
        id: meta['id'],
        ...(meta['url'] != null && { url: String(meta['url']) }),
        ...(meta['title'] != null && { title: String(meta['title']) }),
        ...(meta['scheduled'] != null && { scheduled: String(meta['scheduled']) }),
        ...(meta['started'] != null && { started: String(meta['started']) }),
        ...(meta['duration'] != null && { duration: Number(meta['duration']) }),
        ...(meta['primaryUserId'] != null && { primaryUserId: String(meta['primaryUserId']) }),
        ...(meta['direction'] != null && { direction: String(meta['direction']) }),
        ...(meta['system'] != null && { system: String(meta['system']) }),
        ...(meta['scope'] != null && { scope: String(meta['scope']) }),
        ...(meta['media'] != null && { media: String(meta['media']) }),
        ...(meta['language'] != null && { language: String(meta['language']) }),
        ...(meta['workspaceId'] != null && { workspaceId: String(meta['workspaceId']) }),
        ...(meta['sdrDisposition'] != null && { sdrDisposition: String(meta['sdrDisposition']) }),
        ...(meta['clientUniqueId'] != null && { clientUniqueId: String(meta['clientUniqueId']) }),
        ...(meta['customData'] != null && { customData: String(meta['customData']) }),
        ...(meta['purpose'] != null && { purpose: String(meta['purpose']) }),
        ...(meta['meetingUrl'] != null && { meetingUrl: String(meta['meetingUrl']) }),
        ...(meta['isPrivate'] != null && { isPrivate: Boolean(meta['isPrivate']) }),
        ...(meta['calendarEventId'] != null && { calendarEventId: String(meta['calendarEventId']) }),
        ...(extensive.context != null && { context: extensive.context }),
        ...(extensive.parties != null && {
            parties: extensive.parties.map((p) => ({
                id: p.id,
                ...(p.emailAddress != null && { emailAddress: p.emailAddress }),
                ...(p.name != null && { name: p.name }),
                ...(p.title != null && { title: p.title }),
                ...(p.userId != null && { userId: p.userId }),
                speakerId: p.speakerId ?? null,
                ...(p.affiliation != null && { affiliation: p.affiliation }),
                ...(p.methods != null && { methods: p.methods })
            }))
        }),
        ...(extensive.interaction != null && { interaction: extensive.interaction }),
        ...(extensive.collaboration != null && { collaboration: extensive.collaboration }),
        ...(extensive.media != null && { mediaUrls: extensive.media })
    };
}
