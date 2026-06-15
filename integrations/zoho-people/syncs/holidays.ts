import { createSync } from 'nango';
import { z } from 'zod';

const HolidaySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    holidayType: z.string().optional()
});

const ProviderHolidaySchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        holidayType: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    holidays: z.array(z.unknown()),
    status: z.string()
});

const sync = createSync({
    description: 'Sync configured holidays.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Holiday: HolidaySchema
    },
    endpoints: [
        {
            path: '/syncs/holidays',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        // Full refresh: the provider does not expose a changed-since filter,
        // cursor, or deleted-record endpoint for holidays. The dataset is small
        // and static, so we fetch all configured holidays year-by-year.
        const currentYear = new Date().getFullYear();
        const years = [currentYear, currentYear + 1, currentYear + 2];
        const allHolidays: Array<{ id: string; name?: string; from?: string; to?: string; holidayType?: string }> = [];

        await nango.trackDeletesStart('Holiday');

        for (const year of years) {
            const fromDate = `01-Jan-${year}`;
            const toDate = `31-Dec-${year}`;

            // https://www.zoho.com/people/api/overview.html
            const response = await nango.get({
                endpoint: '/api/v2/leavetracker/holidays',
                params: {
                    from: fromDate,
                    to: toDate
                },
                retries: 3
            });

            const parsed = ProviderResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse holidays response for ${year}: ${parsed.error.message}`);
            }

            const providerHolidays = parsed.data.holidays;
            const mapped = providerHolidays.map((raw: unknown) => {
                const holiday = ProviderHolidaySchema.safeParse(raw);
                if (!holiday.success) {
                    throw new Error(`Failed to parse holiday record: ${holiday.error.message}`);
                }
                return {
                    id: holiday.data.id,
                    ...(holiday.data.name !== undefined && { name: holiday.data.name }),
                    ...(holiday.data.from !== undefined && { from: holiday.data.from }),
                    ...(holiday.data.to !== undefined && { to: holiday.data.to }),
                    ...(holiday.data.holidayType !== undefined && { holidayType: holiday.data.holidayType })
                };
            });

            allHolidays.push(...mapped);
        }

        if (allHolidays.length > 0) {
            await nango.batchSave(allHolidays, 'Holiday');
        }

        await nango.trackDeletesEnd('Holiday');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
