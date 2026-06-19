import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from: z.string().optional().describe('Start of date range filter. ISO 8601 string. Example: "2026-01-01T00:00:00Z"'),
    to: z.string().optional().describe('End of date range filter. ISO 8601 string. Example: "2026-01-31T23:59:59Z"'),
    workspaceId: z.string().optional().describe('Filter transcripts to a specific Gong workspace. Example: "623457276584334"'),
    callIds: z.array(z.string()).optional().describe('Filter to specific call IDs. Example: ["123456789"]'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const SentenceSchema = z
    .object({
        start: z.number().optional(),
        end: z.number().optional(),
        text: z.string().optional()
    })
    .passthrough();

const TranscriptBlockSchema = z
    .object({
        speakerId: z.string().optional(),
        topic: z.string().optional(),
        sentences: z.array(SentenceSchema).optional()
    })
    .passthrough();

const CallTranscriptSchema = z
    .object({
        callId: z.string().optional(),
        transcript: z.array(TranscriptBlockSchema).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    transcripts: z.array(CallTranscriptSchema).describe('Transcript data for the returned page'),
    nextCursor: z.string().optional().describe('Pass this cursor to the next call to retrieve the following page. Absent when there are no more pages.'),
    totalRecords: z.number().optional().describe('Total number of matching transcripts across all pages')
});

const AxiosErrorSchema = z.object({
    response: z.object({ status: z.number(), data: z.unknown().optional() }).optional(),
    status: z.number().optional()
});

function isHttpErrorWithStatus(error: unknown, status: number): boolean {
    if (typeof error !== 'object' || error === null) return false;
    if ('status' in error && error.status === status) return true;
    if (!('response' in error) || typeof error.response !== 'object' || error.response === null) return false;
    return 'status' in error.response && error.response.status === status;
}

const action = createAction({
    description:
        'Fetch a page of Gong call transcripts, optionally filtered by date range, workspace, or call IDs. Use the returned nextCursor to retrieve subsequent pages.',
    version: '4.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.from && !input.to && !input.callIds && !input.workspaceId && !input.cursor) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one filter must be provided: from, to, callIds, workspaceId, or cursor.'
            });
        }

        const filter: Record<string, unknown> = {
            ...(input.from && { fromDateTime: new Date(input.from).toISOString() }),
            ...(input.to && { toDateTime: new Date(input.to).toISOString() }),
            ...(input.workspaceId && { workspaceId: input.workspaceId }),
            ...(input.callIds && input.callIds.length > 0 && { callIds: input.callIds })
        };

        const body: Record<string, unknown> = {
            filter,
            ...(input.cursor && { cursor: input.cursor })
        };

        const emptyResult: z.infer<typeof OutputSchema> = { transcripts: [] };

        // @allowTryCatch
        // Gong returns HTTP 404 with "No calls found" when no transcripts match the filter — treat as empty.
        try {
            // https://app.gong.io/settings/api/documentation#post-/v2/calls/transcript
            const response = await nango.post({
                endpoint: '/v2/calls/transcript',
                data: body,
                retries: 3
            });

            const rawData = response.data;
            if (!rawData) {
                return emptyResult;
            }

            const rawTranscripts = Array.isArray(rawData.callTranscripts) ? rawData.callTranscripts : [];
            const parsed = z.array(CallTranscriptSchema).safeParse(rawTranscripts);
            const transcripts = parsed.success ? parsed.data : [];

            return {
                transcripts,
                ...(rawData.records?.cursor && { nextCursor: rawData.records.cursor }),
                ...(rawData.records?.totalRecords !== undefined && { totalRecords: rawData.records.totalRecords })
            };
        } catch (error: unknown) {
            if (isHttpErrorWithStatus(error, 404)) {
                const parsedErr = AxiosErrorSchema.safeParse(error);
                const data = parsedErr.success ? parsedErr.data.response?.data : undefined;
                const parsed = z.object({ errors: z.array(z.string()).optional() }).safeParse(data);
                if (!parsed.success || !parsed.data.errors || parsed.data.errors.some((e) => e.includes('No calls found'))) {
                    return emptyResult;
                }
            }
            throw error;
        }
    }
});

export default action;
