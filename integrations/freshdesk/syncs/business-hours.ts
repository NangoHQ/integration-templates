import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderDayHoursSchema = z.object({
    start_time: z.string(),
    end_time: z.string()
});

const ProviderBusinessHoursSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    description: z.string().nullable(),
    time_zone: z.string(),
    is_default: z.boolean(),
    business_hours: z
        .object({
            monday: ProviderDayHoursSchema.nullable().optional(),
            tuesday: ProviderDayHoursSchema.nullable().optional(),
            wednesday: ProviderDayHoursSchema.nullable().optional(),
            thursday: ProviderDayHoursSchema.nullable().optional(),
            friday: ProviderDayHoursSchema.nullable().optional(),
            saturday: ProviderDayHoursSchema.nullable().optional(),
            sunday: ProviderDayHoursSchema.nullable().optional()
        })
        .optional()
        .nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const DayHoursSchema = z
    .object({
        start_time: z.string().describe('Start time in hh:mm:ss a format, e.g., 08:00:00 am'),
        end_time: z.string().describe('End time in hh:mm:ss a format, e.g., 05:00:00 pm')
    })
    .describe('Daily business hours schedule with start and end times');

const BusinessHoursScheduleSchema = z
    .object({
        monday: DayHoursSchema.optional().describe('Monday operating hours'),
        tuesday: DayHoursSchema.optional().describe('Tuesday operating hours'),
        wednesday: DayHoursSchema.optional().describe('Wednesday operating hours'),
        thursday: DayHoursSchema.optional().describe('Thursday operating hours'),
        friday: DayHoursSchema.optional().describe('Friday operating hours'),
        saturday: DayHoursSchema.optional().describe('Saturday operating hours'),
        sunday: DayHoursSchema.optional().describe('Sunday operating hours')
    })
    .describe('Weekly business hours schedule for each day of the week');

const BusinessHourSchema = z
    .object({
        id: z.string().describe('Unique identifier of the business hours configuration'),
        name: z.string().describe('Name of the business hours configuration'),
        description: z.string().optional().describe('Description of the business hours configuration'),
        time_zone: z.string().describe('Time zone of the business hours configuration'),
        is_default: z.boolean().describe('Whether this is the default business hours configuration for the account'),
        business_hours: BusinessHoursScheduleSchema.optional().describe('Weekly schedule with start and end times for each day'),
        created_at: z.string().describe('Timestamp when the business hours configuration was created in UTC'),
        updated_at: z.string().describe('Timestamp when the business hours configuration was last updated in UTC')
    })
    .describe('Business hours configuration defining support desk operating hours');

function mapBusinessHours(pageResults: unknown[]): z.infer<typeof BusinessHourSchema>[] {
    return pageResults.map((record) => {
        const validated = ProviderBusinessHoursSchema.safeParse(record);
        if (!validated.success) {
            throw new Error(`Failed to parse business hour record: ${validated.error.message}`);
        }

        const data = validated.data;

        return {
            id: String(data.id),
            name: data.name,
            ...(data.description != null && { description: data.description }),
            time_zone: data.time_zone,
            is_default: data.is_default,
            ...(data.business_hours != null && {
                business_hours: {
                    ...(data.business_hours.monday != null && { monday: data.business_hours.monday }),
                    ...(data.business_hours.tuesday != null && { tuesday: data.business_hours.tuesday }),
                    ...(data.business_hours.wednesday != null && { wednesday: data.business_hours.wednesday }),
                    ...(data.business_hours.thursday != null && { thursday: data.business_hours.thursday }),
                    ...(data.business_hours.friday != null && { friday: data.business_hours.friday }),
                    ...(data.business_hours.saturday != null && { saturday: data.business_hours.saturday }),
                    ...(data.business_hours.sunday != null && { sunday: data.business_hours.sunday })
                }
            }),
            created_at: data.created_at,
            updated_at: data.updated_at
        };
    });
}

const sync = createSync({
    description: 'Sync business hours configurations from Freshdesk',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        BusinessHour: BusinessHourSchema
    },

    // Blocker: provider only exposes /api/v2/business_hours with no changed-since filter
    // and no deleted-record endpoint, so this is a delete-tracked full refresh. Delete-tracked
    // syncs must always start from page 1 and complete a full enumeration per Nango
    // requirements, so there is no resumable checkpoint.
    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#list_all_business_hours
            endpoint: '/api/v2/business_hours',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        const iterator = nango.paginate(proxyConfig);

        // Fetch and validate the first page before opening the delete-tracking window, so a
        // transient empty or invalid response can't wipe out previously-synced records.
        const first = await iterator.next();
        const firstRecords = first.done ? [] : mapBusinessHours(first.value);

        await nango.trackDeletesStart('BusinessHour');

        if (firstRecords.length > 0) {
            await nango.batchSave(firstRecords, 'BusinessHour');
        }

        let next = await iterator.next();
        while (!next.done) {
            const records = mapBusinessHours(next.value);
            if (records.length > 0) {
                await nango.batchSave(records, 'BusinessHour');
            }
            next = await iterator.next();
        }

        await nango.trackDeletesEnd('BusinessHour');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
