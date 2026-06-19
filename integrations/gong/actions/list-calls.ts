import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fromDateTime: z.string().optional().describe('Start of the date range in ISO 8601 UTC format. Example: "2026-01-01T00:00:00Z"'),
    toDateTime: z.string().optional().describe('End of the date range in ISO 8601 UTC format. Example: "2026-01-31T23:59:59Z"'),
    workspaceId: z.string().optional().describe('Gong workspace ID to filter calls by.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderCallSchema = z
    .object({
        id: z.string(),
        url: z.string().optional(),
        title: z.string().optional(),
        started: z.string().optional(),
        duration: z.number().optional(),
        primaryUserId: z.string().optional(),
        workspaceId: z.string().optional(),
        direction: z.string().optional(),
        disposition: z.string().optional(),
        customData: z.string().optional(),
        scheduledStart: z.string().optional(),
        system: z.string().optional(),
        scope: z.string().optional(),
        media: z.string().optional(),
        language: z.string().optional(),
        sdrDisposition: z.string().optional(),
        clientUniqueId: z.string().optional(),
        purpose: z.string().optional(),
        meetingUrl: z.string().optional(),
        isPrivate: z.boolean().optional(),
        calendarEventId: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    calls: z.array(z.unknown()).optional(),
    records: z
        .object({
            totalRecords: z.number().optional(),
            currentPageSize: z.number().optional(),
            cursor: z.string().optional()
        })
        .optional()
});

const CallSchema = z.object({
    id: z.string(),
    url: z.string().optional(),
    title: z.string().optional(),
    started: z.string().optional(),
    duration: z.number().optional(),
    primaryUserId: z.string().optional(),
    workspaceId: z.string().optional(),
    direction: z.string().optional(),
    disposition: z.string().optional(),
    customData: z.string().optional(),
    scheduledStart: z.string().optional(),
    system: z.string().optional(),
    scope: z.string().optional(),
    media: z.string().optional(),
    language: z.string().optional(),
    sdrDisposition: z.string().optional(),
    clientUniqueId: z.string().optional(),
    purpose: z.string().optional(),
    meetingUrl: z.string().optional(),
    isPrivate: z.boolean().optional(),
    calendarEventId: z.string().optional()
});

const OutputSchema = z.object({
    calls: z.array(CallSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List calls from Gong with optional date-range filters.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:calls:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;

        // @allowTryCatch Gong returns HTTP 404 with "No calls found corresponding to the provided filters"
        // when there are no matching calls. This must be treated as a valid empty result, not an error.
        try {
            // https://help.gong.io/docs/what-the-gong-api-provides
            response = await nango.get({
                endpoint: '/v2/calls',
                params: {
                    ...(input.fromDateTime !== undefined && { fromDateTime: input.fromDateTime }),
                    ...(input.toDateTime !== undefined && { toDateTime: input.toDateTime }),
                    ...(input.workspaceId !== undefined && { workspaceId: input.workspaceId }),
                    ...(input.cursor !== undefined && { cursor: input.cursor })
                },
                retries: 3
            });
        } catch (error) {
            if (
                error &&
                typeof error === 'object' &&
                'status' in error &&
                error.status === 404 &&
                'response' in error &&
                error.response &&
                typeof error.response === 'object' &&
                'data' in error.response
            ) {
                const errorData = z
                    .object({
                        errors: z.array(z.string()).optional()
                    })
                    .safeParse(error.response.data);

                if (errorData.success && errorData.data.errors?.some((e) => e.includes('No calls found'))) {
                    return {
                        calls: []
                    };
                }
            }

            throw error;
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const calls = (providerResponse.calls ?? []).map((call) => {
            const parsed = ProviderCallSchema.parse(call);
            return {
                id: parsed.id,
                ...(parsed.url !== undefined && { url: parsed.url }),
                ...(parsed.title !== undefined && { title: parsed.title }),
                ...(parsed.started !== undefined && { started: parsed.started }),
                ...(parsed.duration !== undefined && { duration: parsed.duration }),
                ...(parsed.primaryUserId !== undefined && { primaryUserId: parsed.primaryUserId }),
                ...(parsed.workspaceId !== undefined && { workspaceId: parsed.workspaceId }),
                ...(parsed.direction !== undefined && { direction: parsed.direction }),
                ...(parsed.disposition !== undefined && { disposition: parsed.disposition }),
                ...(parsed.customData !== undefined && { customData: parsed.customData }),
                ...(parsed.scheduledStart !== undefined && { scheduledStart: parsed.scheduledStart }),
                ...(parsed.system !== undefined && { system: parsed.system }),
                ...(parsed.scope !== undefined && { scope: parsed.scope }),
                ...(parsed.media !== undefined && { media: parsed.media }),
                ...(parsed.language !== undefined && { language: parsed.language }),
                ...(parsed.sdrDisposition !== undefined && { sdrDisposition: parsed.sdrDisposition }),
                ...(parsed.clientUniqueId !== undefined && { clientUniqueId: parsed.clientUniqueId }),
                ...(parsed.purpose !== undefined && { purpose: parsed.purpose }),
                ...(parsed.meetingUrl !== undefined && { meetingUrl: parsed.meetingUrl }),
                ...(parsed.isPrivate !== undefined && { isPrivate: parsed.isPrivate }),
                ...(parsed.calendarEventId !== undefined && { calendarEventId: parsed.calendarEventId })
            };
        });

        return {
            calls,
            ...(providerResponse.records?.cursor !== undefined && { nextCursor: providerResponse.records.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
