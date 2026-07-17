import { createSync } from 'nango';
import { z } from 'zod';

const RawOpportunitySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    monetaryValue: z.number().nullish(),
    pipelineId: z.string().nullish(),
    pipelineStageId: z.string().nullish(),
    assignedTo: z.string().nullish(),
    status: z.string().nullish(),
    source: z.string().nullish(),
    lastStatusChangeAt: z.string().nullish(),
    lastStageChangeAt: z.string().nullish(),
    lastActionDate: z.string().nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish(),
    contactId: z.string().nullish(),
    locationId: z.string().nullish(),
    lostReasonId: z.string().nullish(),
    externalObjectId: z.string().nullish()
});

type RawOpportunity = z.infer<typeof RawOpportunitySchema>;

const OpportunitySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    monetaryValue: z.number().optional(),
    pipelineId: z.string().optional(),
    pipelineStageId: z.string().optional(),
    assignedTo: z.string().optional(),
    status: z.string().optional(),
    source: z.string().optional(),
    lastStatusChangeAt: z.string().optional(),
    lastStageChangeAt: z.string().optional(),
    lastActionDate: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    contactId: z.string().optional(),
    locationId: z.string().optional(),
    lostReasonId: z.string().optional(),
    externalObjectId: z.string().optional()
});

type Opportunity = z.infer<typeof OpportunitySchema>;

const OpportunitiesResponseSchema = z.object({
    opportunities: z.array(RawOpportunitySchema).optional(),
    total: z.number().optional(),
    traceId: z.string().optional(),
    aggregations: z.unknown().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive(),
    in_progress: z.boolean()
});

const LIMIT = 100;

function mapOpportunity(raw: RawOpportunity): Opportunity {
    const record: Opportunity = { id: raw.id };

    if (raw.name !== undefined && raw.name !== null) {
        record.name = raw.name;
    }
    if (raw.monetaryValue !== undefined && raw.monetaryValue !== null) {
        record.monetaryValue = raw.monetaryValue;
    }
    if (raw.pipelineId !== undefined && raw.pipelineId !== null) {
        record.pipelineId = raw.pipelineId;
    }
    if (raw.pipelineStageId !== undefined && raw.pipelineStageId !== null) {
        record.pipelineStageId = raw.pipelineStageId;
    }
    if (raw.assignedTo !== undefined && raw.assignedTo !== null) {
        record.assignedTo = raw.assignedTo;
    }
    if (raw.status !== undefined && raw.status !== null) {
        record.status = raw.status;
    }
    if (raw.source !== undefined && raw.source !== null) {
        record.source = raw.source;
    }
    if (raw.lastStatusChangeAt !== undefined && raw.lastStatusChangeAt !== null) {
        record.lastStatusChangeAt = raw.lastStatusChangeAt;
    }
    if (raw.lastStageChangeAt !== undefined && raw.lastStageChangeAt !== null) {
        record.lastStageChangeAt = raw.lastStageChangeAt;
    }
    if (raw.lastActionDate !== undefined && raw.lastActionDate !== null) {
        record.lastActionDate = raw.lastActionDate;
    }
    if (raw.createdAt !== undefined && raw.createdAt !== null) {
        record.createdAt = raw.createdAt;
    }
    if (raw.updatedAt !== undefined && raw.updatedAt !== null) {
        record.updatedAt = raw.updatedAt;
    }
    if (raw.contactId !== undefined && raw.contactId !== null) {
        record.contactId = raw.contactId;
    }
    if (raw.locationId !== undefined && raw.locationId !== null) {
        record.locationId = raw.locationId;
    }
    if (raw.lostReasonId !== undefined && raw.lostReasonId !== null) {
        record.lostReasonId = raw.lostReasonId;
    }
    if (raw.externalObjectId !== undefined && raw.externalObjectId !== null) {
        record.externalObjectId = raw.externalObjectId;
    }

    return record;
}

const sync = createSync({
    description: 'Sync opportunities from HighLevel.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['opportunities.readonly'],
    checkpoint: CheckpointSchema,
    models: {
        Opportunity: OpportunitySchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const locationId = typeof metadata['locationId'] === 'string' ? metadata['locationId'] : undefined;

        if (!locationId) {
            throw new Error('locationId is required in connection metadata');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? {});
        const checkpoint = checkpointResult.success ? checkpointResult.data : undefined;
        let page = checkpoint?.page ?? 1;

        // Blocker: /opportunities/search exposes full-refresh pagination state (`page`) but no
        // documented changed-since filter or explicit ascending updated cursor, so we only
        // checkpoint the page number to resume an in-progress full refresh safely.
        if (checkpoint?.in_progress !== true) {
            await nango.trackDeletesStart('Opportunity');
            page = 1;
            await nango.saveCheckpoint({
                page,
                in_progress: true
            });
        }

        while (true) {
            // https://highlevel.stoplight.io/docs/integrations/opportunities/search-opportunities-advanced
            const response = await nango.post({
                endpoint: '/opportunities/search',
                headers: {
                    Version: '2021-07-28'
                },
                data: {
                    locationId,
                    query: '',
                    limit: LIMIT,
                    page,
                    searchAfter: [],
                    additionalDetails: {
                        notes: false,
                        tasks: false,
                        calendarEvents: false
                    }
                },
                retries: 3
            });

            const parsedResponse = OpportunitiesResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Invalid response from POST /opportunities/search: ${parsedResponse.error.message}`);
            }

            const opportunities = parsedResponse.data.opportunities ?? [];
            const records = opportunities.map(mapOpportunity);

            if (records.length > 0) {
                await nango.batchSave(records, 'Opportunity');
            }

            const total = parsedResponse.data.total;
            const reachedEnd = opportunities.length === 0 || opportunities.length < LIMIT || (typeof total === 'number' && page * LIMIT >= total);

            if (reachedEnd) {
                break;
            }

            page += 1;
            await nango.saveCheckpoint({
                page,
                in_progress: true
            });
        }

        await nango.trackDeletesEnd('Opportunity');
        await nango.saveCheckpoint({
            page: 1,
            in_progress: false
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
