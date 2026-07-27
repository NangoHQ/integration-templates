import { createSync } from 'nango';
import { z } from 'zod';

const ProviderPublicHolidaySchema = z.object({
    id: z.number().describe('The unique Id for this public holiday'),
    name: z.string().nullable().optional(),
    date: z.string(),
    formattedDate: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    countryCode: z.string().nullable().optional(),
    bankHolidaySetId: z.number(),
    bankHolidaySetName: z.string().nullable().optional()
});

const PublicHolidaySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    date: z.string(),
    formattedDate: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    countryCode: z.string().optional(),
    bankHolidaySetId: z.number(),
    bankHolidaySetName: z.string().optional()
});

const sync = createSync({
    description: 'Sync public holidays.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        PublicHoliday: PublicHolidaySchema
    },

    exec: async (nango) => {
        // Blocker: GET /publicholidays returns all organisation public holidays in a single
        // unbounded array with no changed-since filter, no deleted-record endpoint,
        // no pagination cursor, and no offset or page support. The optional year filter
        // limits results to one calendar year but does not support incremental change
        // tracking, so a full refresh with delete tracking is required.
        await nango.trackDeletesStart('PublicHoliday');

        // https://timetastic.co.uk/api/ (interactive OpenAPI reference)
        // https://help.timetastic.co.uk/en/articles/13193377-timetastic-api
        const response = await nango.get({
            endpoint: '/publicholidays',
            retries: 3
        });

        const raw = response.data;

        if (!Array.isArray(raw)) {
            throw new Error('Expected public holidays response to be an array');
        }

        const holidays = raw.map((item: unknown) => {
            const parsed = ProviderPublicHolidaySchema.safeParse(item);
            if (!parsed.success) {
                throw new Error(`Failed to parse public holiday: ${parsed.error.message}`);
            }

            const record = parsed.data;

            return {
                id: String(record.id),
                ...(record.name != null && { name: record.name }),
                date: record.date,
                ...(record.formattedDate != null && { formattedDate: record.formattedDate }),
                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
                ...(record.countryCode != null && { countryCode: record.countryCode }),
                bankHolidaySetId: record.bankHolidaySetId,
                ...(record.bankHolidaySetName != null && { bankHolidaySetName: record.bankHolidaySetName })
            };
        });

        if (holidays.length > 0) {
            await nango.batchSave(holidays, 'PublicHoliday');
        }

        await nango.trackDeletesEnd('PublicHoliday');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
