import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userIds: z.array(z.string()).describe('Gong user IDs (up to 20 digits). Example: ["7254376376091929519"]'),
    referenceDate: z.string().describe('The date in YYYY-MM-DD format. Example: "2026-01-01"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const InteractionStatSchema = z.object({
    name: z.string(),
    value: z.number()
});

const PersonInteractionStatsSchema = z.object({
    userId: z.string(),
    userEmailAddress: z.string().optional(),
    personInteractionStats: z.array(InteractionStatSchema).optional(),
    timeZone: z.string().optional(),
    fromDateTime: z.string().optional(),
    toDateTime: z.string().optional()
});

const RecordsSchema = z.object({
    totalRecords: z.number().optional(),
    currentPageSize: z.number().optional(),
    currentPageNumber: z.number().optional(),
    cursor: z.string().optional()
});

const OutputSchema = z.object({
    requestId: z.string().optional(),
    peopleInteractionStats: z.array(PersonInteractionStatsSchema).optional(),
    records: RecordsSchema.optional()
});

const action = createAction({
    description: 'Retrieve interaction statistics for users on a specific date',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-stats-interaction',
        group: 'Stats'
    },
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

        const response = await nango.post({
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

        const status = response.status;
        if (status === 404 || status === 401) {
            return {
                peopleInteractionStats: [],
                records: {
                    totalRecords: 0,
                    currentPageSize: 0,
                    currentPageNumber: 0
                }
            };
        }

        const data = response.data;

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
