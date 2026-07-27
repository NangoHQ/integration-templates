import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    countryCode: z.string().optional().describe('Optional country code to filter public holidays. Example: "GB"'),
    year: z.number().int().optional().describe('Optional year to filter public holidays. Example: 2026'),
    userId: z.number().int().optional().describe('Optional user id to filter public holidays. Example: 1522999'),
    bankHolidaySetId: z.number().int().optional().describe('Optional bank holiday set id to filter public holidays.'),
    useOrgLeaveYear: z.boolean().optional().describe('Optional flag to return public holidays for the organisation leave year.')
});

const PublicHolidaySchema = z.object({
    id: z.number().int(),
    name: z.string().nullable().optional(),
    date: z.string().optional(),
    formattedDate: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    countryCode: z.string().nullable().optional(),
    bankHolidaySetId: z.number().int().optional(),
    bankHolidaySetName: z.string().nullable().optional()
});

const OutputSchema = z.object({
    publicHolidays: z.array(PublicHolidaySchema)
});

const action = createAction({
    description: 'List public holidays for the organisation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://timetastic.co.uk/api/ and https://app.timetastic.co.uk/swagger/v1/swagger.json
            endpoint: '/publicholidays',
            params: {
                ...(input.countryCode !== undefined && { countryCode: input.countryCode }),
                ...(input.year !== undefined && { year: String(input.year) }),
                ...(input.userId !== undefined && { userId: String(input.userId) }),
                ...(input.bankHolidaySetId !== undefined && { bankHolidaySetId: String(input.bankHolidaySetId) }),
                ...(input.useOrgLeaveYear !== undefined && { useOrgLeaveYear: String(input.useOrgLeaveYear) })
            },
            retries: 3
        });

        const parsed = z.array(PublicHolidaySchema).parse(response.data);

        return {
            publicHolidays: parsed
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
