import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fromDateTime: z.string().optional().describe('Start date in ISO 8601 UTC format. Example: "2026-01-01T00:00:00Z"'),
    toDateTime: z.string().optional().describe('End date in ISO 8601 UTC format. Example: "2026-01-01T00:00:00Z"'),
    workspaceId: z.string().optional().describe('Workspace ID to filter by. Example: "7273476131570014205"'),
    callIds: z.array(z.string()).optional().describe('Specific call IDs to retrieve transcripts for.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
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

const CallTranscriptSchema = z.object({
    callId: z.string().optional(),
    transcript: z.array(MonologueSchema).optional()
});

const OutputSchema = z.object({
    callTranscripts: z.array(CallTranscriptSchema),
    nextCursor: z.string().optional(),
    totalRecords: z.number().optional(),
    currentPageSize: z.number().optional()
});

const GongErrorSchema = z
    .object({
        response: z
            .object({
                status: z.number(),
                data: z
                    .object({
                        errors: z.array(z.string())
                    })
                    .optional()
            })
            .passthrough()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    callTranscripts: z.array(CallTranscriptSchema).optional(),
    records: z
        .object({
            totalRecords: z.number().optional(),
            currentPageSize: z.number().optional(),
            cursor: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'List call transcripts from Gong using date-range or other filters.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-call-transcripts',
        group: 'Calls'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:calls:read:transcript'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const filter: Record<string, unknown> = {};
        if (input.fromDateTime !== undefined) {
            filter['fromDateTime'] = input.fromDateTime;
        }
        if (input.toDateTime !== undefined) {
            filter['toDateTime'] = input.toDateTime;
        }
        if (input.workspaceId !== undefined) {
            filter['workspaceId'] = input.workspaceId;
        }
        if (input.callIds !== undefined && input.callIds.length > 0) {
            filter['callIds'] = input.callIds;
        }

        const body: Record<string, unknown> = { filter };
        if (input.cursor !== undefined) {
            body['cursor'] = input.cursor;
        }

        let response;
        // @allowTryCatch Gong returns 404 with "No calls found" when the filter matches no calls. We treat this as a valid empty result rather than an error.
        try {
            response = await nango.post({
                // https://help.gong.io/docs/what-the-gong-api-provides
                endpoint: '/v2/calls/transcript',
                data: body,
                retries: 3
            });
        } catch (error) {
            const parsedError = GongErrorSchema.safeParse(error);
            if (
                parsedError.success &&
                parsedError.data.response.status === 404 &&
                parsedError.data.response.data !== undefined &&
                parsedError.data.response.data.errors.some((e) => e.includes('No calls found'))
            ) {
                return {
                    callTranscripts: [],
                    totalRecords: 0,
                    currentPageSize: 0
                };
            }
            throw error;
        }

        if (
            response.status === 404 &&
            typeof response.data === 'object' &&
            response.data !== null &&
            'errors' in response.data &&
            Array.isArray(response.data.errors) &&
            response.data.errors.some((e: unknown) => typeof e === 'string' && e.includes('No calls found'))
        ) {
            return {
                callTranscripts: [],
                totalRecords: 0,
                currentPageSize: 0
            };
        }

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Gong API.'
            });
        }

        const data = parsedResponse.data;
        return {
            callTranscripts: data.callTranscripts || [],
            ...(data.records?.cursor !== undefined && { nextCursor: data.records.cursor }),
            ...(data.records?.totalRecords !== undefined && { totalRecords: data.records.totalRecords }),
            ...(data.records?.currentPageSize !== undefined && { currentPageSize: data.records.currentPageSize })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
