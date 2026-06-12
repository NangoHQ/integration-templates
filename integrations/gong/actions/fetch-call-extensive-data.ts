import { z } from 'zod';
import { createAction } from 'nango';

const ContentSelectorSchema = z.object({
    context: z.string().optional(),
    contextTiming: z.array(z.string()).optional(),
    exposedFields: z
        .object({
            parties: z.boolean().optional(),
            media: z.boolean().optional(),
            collaboration: z
                .object({
                    publicComments: z.boolean().optional()
                })
                .optional(),
            content: z
                .object({
                    pointsOfInterest: z.boolean().optional(),
                    structure: z.boolean().optional(),
                    topics: z.boolean().optional(),
                    trackers: z.boolean().optional(),
                    brief: z.boolean().optional(),
                    outline: z.boolean().optional(),
                    highlights: z.boolean().optional(),
                    callOutcome: z.boolean().optional(),
                    keyPoints: z.boolean().optional()
                })
                .optional(),
            interaction: z
                .object({
                    personInteractionStats: z.boolean().optional(),
                    questions: z.boolean().optional(),
                    speakers: z.boolean().optional(),
                    video: z.boolean().optional()
                })
                .optional()
        })
        .optional()
});

const InputSchema = z.object({
    callIds: z.array(z.string()).optional().describe('Array of call IDs to filter by. Example: ["123456789"]'),
    fromDateTime: z.string().optional().describe('Start of date range filter. ISO 8601 UTC string. Example: "2026-01-01T00:00:00Z"'),
    toDateTime: z.string().optional().describe('End of date range filter. ISO 8601 UTC string. Example: "2026-01-31T23:59:59Z"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    contentSelector: ContentSelectorSchema.optional().describe('Controls which fields are returned in the response.')
});

const CallSchema = z.object({}).passthrough();

const ProviderResponseSchema = z
    .object({
        calls: z.array(CallSchema).optional(),
        cursor: z.string().optional(),
        records: z
            .object({
                totalRecords: z.number().optional(),
                currentPageSize: z.number().optional()
            })
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    calls: z.array(z.object({}).passthrough()),
    cursor: z.string().optional(),
    totalRecords: z.number().optional(),
    currentPageSize: z.number().optional()
});

function isProviderError(error: unknown): error is { response: { status: number; data: unknown } } {
    return (
        error !== null &&
        typeof error === 'object' &&
        'response' in error &&
        error.response !== null &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        typeof error.response.status === 'number'
    );
}

const ProviderErrorSchema = z.object({
    errors: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Fetch detailed Gong call data including content, interaction, and collaboration fields for specific calls.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/fetch-call-extensive-data',
        group: 'Calls'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:calls:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.callIds && !input.fromDateTime && !input.toDateTime) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one filter must be provided: callIds, fromDateTime, or toDateTime.'
            });
        }

        const filter: Record<string, unknown> = {};
        if (input.callIds) {
            filter['callIds'] = input.callIds;
        }
        if (input.fromDateTime) {
            filter['fromDateTime'] = input.fromDateTime;
        }
        if (input.toDateTime) {
            filter['toDateTime'] = input.toDateTime;
        }

        const contentSelector = input.contentSelector ?? {
            exposedFields: {
                parties: true,
                content: {
                    topics: true,
                    trackers: true,
                    highlights: true,
                    pointsOfInterest: true,
                    structure: true,
                    brief: true,
                    outline: true,
                    callOutcome: true,
                    keyPoints: true
                },
                interaction: {
                    speakers: true,
                    questions: true,
                    personInteractionStats: true,
                    video: true
                },
                collaboration: {
                    publicComments: true
                },
                media: true
            }
        };

        const body = {
            filter,
            contentSelector,
            ...(input.cursor !== undefined && { cursor: input.cursor })
        };

        let response;
        // @allowTryCatch Handle the 404 "No calls found" response as a valid empty result
        try {
            // https://help.gong.io/docs/what-the-gong-api-provides
            response = await nango.post({
                endpoint: '/v2/calls/extensive',
                data: body,
                retries: 3
            });
        } catch (error) {
            if (isProviderError(error) && error.response.status === 404) {
                const errorData = ProviderErrorSchema.safeParse(error.response.data);
                if (errorData.success && errorData.data.errors?.some((e) => e.includes('No calls found'))) {
                    return {
                        calls: []
                    };
                }
            }
            throw error;
        }

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response structure from Gong API.'
            });
        }

        const data = providerResponse.data;
        return {
            calls: data.calls ?? [],
            ...(data.cursor !== undefined && { cursor: data.cursor }),
            ...(data.records?.totalRecords !== undefined && { totalRecords: data.records.totalRecords }),
            ...(data.records?.currentPageSize !== undefined && { currentPageSize: data.records.currentPageSize })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
