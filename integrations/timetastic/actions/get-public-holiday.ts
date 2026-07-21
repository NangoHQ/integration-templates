import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('The ID of the public holiday. Example: 11420260')
});

const ProviderPublicHolidaySchema = z.object({
    id: z.number().int(),
    name: z.string().nullable(),
    date: z.string(),
    formattedDate: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    countryCode: z.string().nullable(),
    bankHolidaySetId: z.number().int(),
    bankHolidaySetName: z.string().nullable()
});

const OutputSchema = z.object({
    id: z.number().int(),
    name: z.string().optional(),
    date: z.string(),
    formattedDate: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    countryCode: z.string().optional(),
    bankHolidaySetId: z.number().int(),
    bankHolidaySetName: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single public holiday.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://timetastic.co.uk/api/
            endpoint: `/publicholidays/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Public holiday not found',
                id: input.id
            });
        }

        const providerPublicHoliday = ProviderPublicHolidaySchema.parse(response.data);

        return {
            id: providerPublicHoliday.id,
            date: providerPublicHoliday.date,
            createdAt: providerPublicHoliday.createdAt,
            updatedAt: providerPublicHoliday.updatedAt,
            bankHolidaySetId: providerPublicHoliday.bankHolidaySetId,
            ...(providerPublicHoliday.name != null && { name: providerPublicHoliday.name }),
            ...(providerPublicHoliday.formattedDate != null && { formattedDate: providerPublicHoliday.formattedDate }),
            ...(providerPublicHoliday.countryCode != null && { countryCode: providerPublicHoliday.countryCode }),
            ...(providerPublicHoliday.bankHolidaySetName != null && { bankHolidaySetName: providerPublicHoliday.bankHolidaySetName })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
