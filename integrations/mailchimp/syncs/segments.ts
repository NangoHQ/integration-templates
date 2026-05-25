import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SegmentSchema = z.object({
    id: z.string().describe('The unique id for the segment'),
    name: z.string().optional(),
    member_count: z.number().optional(),
    type: z.string().optional(),
    created_at: z.string().optional().describe('ISO 8601 timestamp'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp'),
    list_id: z.string().describe('The list id'),
    options: z.record(z.string(), z.unknown()).optional()
});

const ProviderSegmentSchema = z.object({
    id: z.number(),
    name: z.string().nullish(),
    member_count: z.number().nullish(),
    type: z.string().nullish(),
    created_at: z.string().nullish().describe('ISO 8601 timestamp'),
    updated_at: z.string().nullish().describe('ISO 8601 timestamp'),
    list_id: z.string().nullish().describe('The list id'),
    options: z.record(z.string(), z.unknown()).nullish()
});

const ProviderListSchema = z.object({
    id: z.string().describe('The unique id for the list')
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

function withOneSecondOverlap(isoTimestamp: string): string {
    const timestamp = Date.parse(isoTimestamp);
    if (Number.isNaN(timestamp)) {
        return isoTimestamp;
    }

    return new Date(timestamp - 1000).toISOString().replace('.000Z', '+00:00');
}

const sync = createSync({
    description: 'Sync segments from Mailchimp',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/segments' }],
    models: {
        Segment: SegmentSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let updatedAfter: string | undefined;
        if (checkpoint !== null && checkpoint !== undefined) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error('Failed to parse checkpoint');
            }
            updatedAfter = parsedCheckpoint.data.updated_after;
        }

        let maxUpdatedAt: string | undefined;

        const listsProxyConfig: ProxyConfiguration = {
            // https://mailchimp.com/developer/marketing/api/lists/get-lists-info/
            endpoint: '/3.0/lists',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'lists'
            },
            retries: 3
        };

        for await (const listsPage of nango.paginate(listsProxyConfig)) {
            if (!Array.isArray(listsPage)) {
                throw new Error('Expected lists page to be an array');
            }

            for (const rawList of listsPage) {
                const listResult = ProviderListSchema.safeParse(rawList);
                if (!listResult.success) {
                    throw new Error(`Failed to parse list: ${listResult.error.message}`);
                }
                const listId = listResult.data.id;

                const segmentsProxyConfig: ProxyConfiguration = {
                    // https://mailchimp.com/developer/marketing/api/list-segments/list-segments/
                    endpoint: `/3.0/lists/${encodeURIComponent(listId)}/segments`,
                    params: {
                        ...(updatedAfter && { since_updated_at: updatedAfter })
                    },
                    paginate: {
                        type: 'offset',
                        offset_name_in_request: 'offset',
                        offset_start_value: 0,
                        offset_calculation_method: 'by-response-size',
                        limit_name_in_request: 'count',
                        limit: 100,
                        response_path: 'segments'
                    },
                    retries: 3
                };

                for await (const segmentsPage of nango.paginate(segmentsProxyConfig)) {
                    if (!Array.isArray(segmentsPage)) {
                        throw new Error('Expected segments page to be an array');
                    }

                    const segments = [];
                    for (const rawSegment of segmentsPage) {
                        const segmentResult = ProviderSegmentSchema.safeParse(rawSegment);
                        if (!segmentResult.success) {
                            throw new Error(`Failed to parse segment: ${segmentResult.error.message}`);
                        }
                        const segment = segmentResult.data;
                        segments.push({
                            id: String(segment.id),
                            ...(segment.name !== null && segment.name !== undefined && { name: segment.name }),
                            ...(segment.member_count !== null && segment.member_count !== undefined && { member_count: segment.member_count }),
                            ...(segment.type !== null && segment.type !== undefined && { type: segment.type }),
                            ...(segment.created_at !== null && segment.created_at !== undefined && { created_at: segment.created_at }),
                            ...(segment.updated_at !== null && segment.updated_at !== undefined && { updated_at: segment.updated_at }),
                            list_id: segment.list_id ?? listId,
                            ...(segment.options !== null && segment.options !== undefined && { options: segment.options })
                        });
                    }

                    if (segments.length > 0) {
                        await nango.batchSave(segments, 'Segment');
                        for (const segment of segments) {
                            if (segment.updated_at && (maxUpdatedAt === undefined || segment.updated_at > maxUpdatedAt)) {
                                maxUpdatedAt = segment.updated_at;
                            }
                        }
                    }
                }
            }
        }

        if (maxUpdatedAt !== undefined) {
            const nextUpdatedAfter = withOneSecondOverlap(maxUpdatedAt);

            if (nextUpdatedAfter !== updatedAfter) {
                await nango.saveCheckpoint({ updated_after: nextUpdatedAfter });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
