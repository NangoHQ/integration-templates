import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    locationId: z.string().describe('Location ID. Example: "AYg6rIXHN1fXdXjGcYvI"'),
    cursor: z.string().optional().describe('Page number for pagination. Omit for the first page.'),
    limit: z.number().optional().describe('Number of records per page. Maximum 100, default 20.'),
    query: z.string().optional().describe('Search query string.')
});

const RawOpportunitySchema = z
    .object({
        id: z.string(),
        name: z.string().nullish(),
        monetaryValue: z.number().nullish(),
        pipelineId: z.string().nullish(),
        pipelineStageId: z.string().nullish(),
        pipelineStageUId: z.string().nullish(),
        assignedTo: z.string().nullish(),
        status: z.string().nullish(),
        source: z.string().nullish(),
        lastStatusChangeAt: z.string().nullish(),
        lastStageChangeAt: z.string().nullish(),
        lastActionDate: z.string().nullish(),
        indexVersion: z.union([z.string(), z.number()]).nullish(),
        createdAt: z.string().nullish(),
        updatedAt: z.string().nullish(),
        contactId: z.string().nullish(),
        locationId: z.string().nullish(),
        contact: z.unknown().nullish(),
        notes: z.array(z.unknown()).nullish(),
        tasks: z.array(z.unknown()).nullish(),
        calendarEvents: z.array(z.unknown()).nullish(),
        lostReasonId: z.string().nullish(),
        customFields: z.array(z.unknown()).nullish(),
        followers: z.array(z.unknown()).nullish(),
        externalObjectId: z.string().nullish(),
        forecastProbability: z.number().nullish(),
        effectiveProbability: z.number().nullish(),
        relations: z.array(z.unknown()).nullish(),
        sort: z.array(z.unknown()).nullish(),
        attributions: z.array(z.unknown()).nullish()
    })
    .passthrough();

const PostSearchResponseSchema = z.object({
    opportunities: z.array(RawOpportunitySchema).nullish(),
    total: z.number(),
    traceId: z.string().optional(),
    aggregations: z.unknown().optional()
});

const OpportunitySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    monetaryValue: z.number().optional(),
    pipelineId: z.string().optional(),
    pipelineStageId: z.string().optional(),
    pipelineStageUId: z.string().optional(),
    assignedTo: z.string().optional(),
    status: z.string().optional(),
    source: z.string().optional(),
    lastStatusChangeAt: z.string().optional(),
    lastStageChangeAt: z.string().optional(),
    lastActionDate: z.string().optional(),
    indexVersion: z.union([z.string(), z.number()]).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    contactId: z.string().optional(),
    locationId: z.string().optional(),
    contact: z.unknown().optional(),
    notes: z.array(z.unknown()).optional(),
    tasks: z.array(z.unknown()).optional(),
    calendarEvents: z.array(z.unknown()).optional(),
    lostReasonId: z.string().optional(),
    customFields: z.array(z.unknown()).optional(),
    followers: z.array(z.unknown()).optional(),
    externalObjectId: z.string().optional(),
    forecastProbability: z.number().optional(),
    effectiveProbability: z.number().optional(),
    relations: z.array(z.unknown()).optional(),
    sort: z.array(z.unknown()).optional(),
    attributions: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    items: z.array(OpportunitySchema),
    nextCursor: z.string().optional(),
    total: z.number()
});

function mapOpportunity(raw: z.infer<typeof RawOpportunitySchema>): z.infer<typeof OpportunitySchema> {
    return {
        id: raw.id,
        ...(raw.name != null && { name: raw.name }),
        ...(raw.monetaryValue != null && { monetaryValue: raw.monetaryValue }),
        ...(raw.pipelineId != null && { pipelineId: raw.pipelineId }),
        ...(raw.pipelineStageId != null && { pipelineStageId: raw.pipelineStageId }),
        ...(raw.pipelineStageUId != null && { pipelineStageUId: raw.pipelineStageUId }),
        ...(raw.assignedTo != null && { assignedTo: raw.assignedTo }),
        ...(raw.status != null && { status: raw.status }),
        ...(raw.source != null && { source: raw.source }),
        ...(raw.lastStatusChangeAt != null && { lastStatusChangeAt: raw.lastStatusChangeAt }),
        ...(raw.lastStageChangeAt != null && { lastStageChangeAt: raw.lastStageChangeAt }),
        ...(raw.lastActionDate != null && { lastActionDate: raw.lastActionDate }),
        ...(raw.indexVersion != null && { indexVersion: raw.indexVersion }),
        ...(raw.createdAt != null && { createdAt: raw.createdAt }),
        ...(raw.updatedAt != null && { updatedAt: raw.updatedAt }),
        ...(raw.contactId != null && { contactId: raw.contactId }),
        ...(raw.locationId != null && { locationId: raw.locationId }),
        ...(raw.contact != null && { contact: raw.contact }),
        ...(raw.notes != null && { notes: raw.notes }),
        ...(raw.tasks != null && { tasks: raw.tasks }),
        ...(raw.calendarEvents != null && { calendarEvents: raw.calendarEvents }),
        ...(raw.lostReasonId != null && { lostReasonId: raw.lostReasonId }),
        ...(raw.customFields != null && { customFields: raw.customFields }),
        ...(raw.followers != null && { followers: raw.followers }),
        ...(raw.externalObjectId != null && { externalObjectId: raw.externalObjectId }),
        ...(raw.forecastProbability != null && { forecastProbability: raw.forecastProbability }),
        ...(raw.effectiveProbability != null && { effectiveProbability: raw.effectiveProbability }),
        ...(raw.relations != null && { relations: raw.relations }),
        ...(raw.sort != null && { sort: raw.sort }),
        ...(raw.attributions != null && { attributions: raw.attributions })
    };
}

const action = createAction({
    description: 'List opportunities from HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['opportunities.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer string'
            });
        }

        const limit = input.limit && input.limit > 0 && input.limit <= 100 ? input.limit : 20;

        const response = await nango.post({
            // https://github.com/GoHighLevel/highlevel-api-docs/blob/main/apps/opportunities.json
            endpoint: '/opportunities/search',
            data: {
                locationId: input.locationId,
                ...(input.query !== undefined && { query: input.query }),
                limit: limit,
                page: page,
                searchAfter: [],
                additionalDetails: {
                    notes: false,
                    tasks: false,
                    calendarEvents: false,
                    unReadConversations: false
                }
            },
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const parsed = PostSearchResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse opportunities search response'
            });
        }

        const data = parsed.data;
        const opportunities = data.opportunities ?? [];
        const total = data.total;
        const hasMore = page * limit < total;

        return {
            items: opportunities.map(mapOpportunity),
            total: total,
            ...(hasMore && { nextCursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
