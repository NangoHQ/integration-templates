import { createSync } from 'nango';
import { z } from 'zod';

const TimeOffTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
    units: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    source: z.string().optional()
});

const ProviderTimeOffTypeSchema = z.object({
    id: z.number().or(z.string()),
    name: z.string(),
    units: z.string().optional(),
    color: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    source: z.string().optional()
});

const ProviderResponseSchema = z.object({
    timeOffTypes: z.array(ProviderTimeOffTypeSchema)
});

const sync = createSync({
    description: 'Sync time off types configured in BambooHR.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/time-off-types',
            method: 'GET'
        }
    ],
    models: {
        TimeOffType: TimeOffTypeSchema
    },

    exec: async (nango) => {
        // https://documentation.bamboohr.com/reference/list-time-off-types
        const response = await nango.get({
            endpoint: '/v1/meta/time_off/types',
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error('Failed to parse time off types response: ' + parsed.error.message);
        }

        await nango.trackDeletesStart('TimeOffType');

        const records = parsed.data.timeOffTypes.map((item) => ({
            id: String(item.id),
            name: item.name,
            ...(item.units !== undefined && { units: item.units }),
            ...(item.color !== undefined && item.color !== null && { color: item.color }),
            ...(item.icon !== undefined && item.icon !== null && { icon: item.icon }),
            ...(item.source !== undefined && { source: item.source })
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'TimeOffType');
        }

        await nango.trackDeletesEnd('TimeOffType');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
