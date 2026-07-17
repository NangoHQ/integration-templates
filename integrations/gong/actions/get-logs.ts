import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    logType: z.string().describe('Type of audit logs to retrieve. Example: "AccessLog"'),
    fromDateTime: z.string().describe('Start of the time range in ISO 8601 UTC format. Example: "2026-01-01T00:00:00Z"'),
    toDateTime: z.string().describe('End of the time range in ISO 8601 UTC format. Example: "2026-06-01T00:00:00Z"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const LogEntrySchema = z
    .object({
        userId: z.string().nullish(),
        userEmailAddress: z.string().nullish(),
        userFullName: z.string().nullish(),
        impersonatorUserId: z.string().nullish(),
        impersonatorEmailAddress: z.string().nullish(),
        impersonatorFullName: z.string().nullish(),
        impersonatorCompanyId: z.string().nullish(),
        eventTime: z.string().nullish(),
        logRecord: z.record(z.string(), z.unknown()).nullish()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        requestId: z.string().optional(),
        records: z
            .object({
                totalRecords: z.number().nullish(),
                currentPageSize: z.number().nullish(),
                currentPageNumber: z.number().nullish(),
                cursor: z.string().nullish()
            })
            .nullish(),
        logEntries: z.array(LogEntrySchema).nullish()
    })
    .passthrough();

const OutputSchema = z.object({
    requestId: z.string().optional(),
    totalRecords: z.number().nullish(),
    currentPageSize: z.number().nullish(),
    currentPageNumber: z.number().nullish(),
    logEntries: z.array(LogEntrySchema).nullable(),
    nextCursor: z.string().nullish()
});

const action = createAction({
    description: 'Retrieve Gong audit logs by type and time range.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:logs:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch We need to handle 401 specifically because the api:logs:read scope may not be enabled on this connection.
        try {
            const response = await nango.get({
                // https://help.gong.io/docs/what-the-gong-api-provides
                endpoint: '/v2/logs',
                params: {
                    logType: input.logType,
                    fromDateTime: input.fromDateTime,
                    toDateTime: input.toDateTime,
                    ...(input.cursor !== undefined && { cursor: input.cursor })
                },
                retries: 3
            });

            const providerData = ProviderResponseSchema.parse(response.data);

            return {
                ...(providerData.requestId !== undefined && { requestId: providerData.requestId }),
                ...(providerData.records?.totalRecords !== undefined && { totalRecords: providerData.records.totalRecords }),
                ...(providerData.records?.currentPageSize !== undefined && { currentPageSize: providerData.records.currentPageSize }),
                ...(providerData.records?.currentPageNumber !== undefined && { currentPageNumber: providerData.records.currentPageNumber }),
                logEntries: providerData.logEntries || [],
                ...(providerData.records?.cursor !== undefined && providerData.records.cursor !== null && { nextCursor: providerData.records.cursor })
            };
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
                throw new nango.ActionError({
                    type: 'unauthorized',
                    message: 'The api:logs:read scope is not enabled for this connection. Enable it in the Gong OAuth app settings to retrieve audit logs.'
                });
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
