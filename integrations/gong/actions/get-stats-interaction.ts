import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userIds: z.array(z.string()).describe('Gong user IDs (up to 20 digits). Example: ["7254376376091929519"]'),
    referenceDate: z.string().describe('The date in YYYY-MM-DD format. Example: "2026-01-01"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const InteractionStatSchema = z.object({
    name: z.string().nullable(),
    value: z.number().nullable()
});

const PersonInteractionStatsSchema = z.object({
    userId: z.string(),
    userEmailAddress: z.string().nullish(),
    personInteractionStats: z.array(InteractionStatSchema).nullish(),
    timeZone: z.string().nullish(),
    fromDateTime: z.string().nullish(),
    toDateTime: z.string().nullish()
});

const RecordsSchema = z.object({
    totalRecords: z.number().nullish(),
    currentPageSize: z.number().nullish(),
    currentPageNumber: z.number().nullish(),
    cursor: z.string().nullish()
});

const OutputSchema = z.object({
    requestId: z.string().optional(),
    peopleInteractionStats: z.array(PersonInteractionStatsSchema).nullish(),
    records: RecordsSchema.nullish()
});

const AxiosErrorSchema = z.object({
    response: z.object({ status: z.number(), data: z.unknown().optional() }).optional(),
    status: z.number().optional()
});

const action = createAction({
    description: 'Retrieve interaction statistics for users on a specific date',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:stats:interaction'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const fromDate = input.referenceDate;
        const dateParts = fromDate.split('-').map(Number);
        const year = dateParts[0];
        const month = dateParts[1];
        const day = dateParts[2];
        if (year === undefined || month === undefined || day === undefined || dateParts.some((part) => Number.isNaN(part))) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'referenceDate must be in YYYY-MM-DD format.'
            });
        }
        const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
        const toDate = nextDay.toISOString().split('T')[0];

        let response;
        // @allowTryCatch The stats/interaction endpoint is plan-gated; 401/404 means the feature is unavailable.
        try {
            response = await nango.post({
                // https://help.gong.io/apidocs/retrieve-interaction-stats-for-applicable-users-by-date-v2statsinteraction
                endpoint: '/v2/stats/interaction',
                data: {
                    filter: {
                        fromDate,
                        toDate,
                        userIds: input.userIds
                    },
                    ...(input.cursor !== undefined && { cursor: input.cursor })
                },
                retries: 3
            });
        } catch (err) {
            const parsedErr = AxiosErrorSchema.safeParse(err);
            const status = parsedErr.success ? (parsedErr.data.response?.status ?? parsedErr.data.status) : undefined;
            if (status === 401 || status === 404) {
                return {
                    peopleInteractionStats: [],
                    records: { totalRecords: 0, currentPageSize: 0, currentPageNumber: 0 }
                };
            }
            throw err;
        }

        const data = response.data;

        if (data !== null && typeof data === 'object' && 'errors' in data && Array.isArray(data.errors) && data.errors.length > 0) {
            return {
                peopleInteractionStats: [],
                records: { totalRecords: 0, currentPageSize: 0, currentPageNumber: 0 }
            };
        }

        const parsedPeopleStats = z.array(PersonInteractionStatsSchema).optional().parse(data.peopleInteractionStats);
        const parsedRecords = RecordsSchema.optional().parse(data.records);

        const peopleInteractionStats = (parsedPeopleStats || []).map((item) => {
            return {
                userId: item.userId,
                ...(item.userEmailAddress !== undefined && { userEmailAddress: item.userEmailAddress }),
                ...(item.personInteractionStats !== undefined && { personInteractionStats: item.personInteractionStats }),
                ...(item.timeZone !== undefined && { timeZone: item.timeZone }),
                ...(item.fromDateTime !== undefined && { fromDateTime: item.fromDateTime }),
                ...(item.toDateTime !== undefined && { toDateTime: item.toDateTime })
            };
        });

        return {
            ...(data.requestId !== undefined && { requestId: String(data.requestId) }),
            peopleInteractionStats,
            ...(parsedRecords !== undefined && {
                records: {
                    ...(parsedRecords.totalRecords !== undefined && { totalRecords: parsedRecords.totalRecords }),
                    ...(parsedRecords.currentPageSize !== undefined && { currentPageSize: parsedRecords.currentPageSize }),
                    ...(parsedRecords.currentPageNumber !== undefined && { currentPageNumber: parsedRecords.currentPageNumber }),
                    ...(parsedRecords.cursor !== undefined && { cursor: parsedRecords.cursor })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
