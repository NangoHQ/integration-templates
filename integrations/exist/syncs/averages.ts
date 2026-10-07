import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AverageSchema = z
    .object({
        id: z.string().describe('Composite identifier for the weekly average, formatted as `{attribute}_{date}`.'),
        attribute: z.string().describe('Name of the tracked attribute the average belongs to, e.g. "steps".'),
        date: z.string().describe('Week-identifying date in YYYY-MM-DD format that this set of averages covers.'),
        overall: z.number().nullable().describe('Average (median) value across the whole week.'),
        monday: z.number().nullable().describe('Average value for Monday of the week.'),
        tuesday: z.number().nullable().describe('Average value for Tuesday of the week.'),
        wednesday: z.number().nullable().describe('Average value for Wednesday of the week.'),
        thursday: z.number().nullable().describe('Average value for Thursday of the week.'),
        friday: z.number().nullable().describe('Average value for Friday of the week.'),
        saturday: z.number().nullable().describe('Average value for Saturday of the week.'),
        sunday: z.number().nullable().describe('Average value for Sunday of the week.')
    })
    .describe('A weekly average (median) snapshot for a single tracked attribute.');

const CheckpointSchema = z.object({
    date_min: z.string().describe('Most recent week date (YYYY-MM-DD) already synced; sent as `date_min` on the next run.')
});

const ProviderAverageSchema = z.object({
    attribute: z.string(),
    date: z.string(),
    overall: z.number().nullable(),
    monday: z.number().nullable(),
    tuesday: z.number().nullable(),
    wednesday: z.number().nullable(),
    thursday: z.number().nullable(),
    friday: z.number().nullable(),
    saturday: z.number().nullable(),
    sunday: z.number().nullable()
});

const sync = createSync({
    description: 'Sync weekly average values per attribute.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Average: AverageSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const proxyConfig: ProxyConfiguration = {
            // https://developer.exist.io/reference/averages/
            endpoint: '/api/2/averages/',
            params: {
                include_historical: 1,
                ...(checkpoint?.date_min && { date_min: checkpoint.date_min })
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        let maxDate: string | undefined;

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const averages = page.map((record) => {
                const parsed = ProviderAverageSchema.parse(record);
                return {
                    id: `${parsed.attribute}_${parsed.date}`,
                    attribute: parsed.attribute,
                    date: parsed.date,
                    overall: parsed.overall,
                    monday: parsed.monday,
                    tuesday: parsed.tuesday,
                    wednesday: parsed.wednesday,
                    thursday: parsed.thursday,
                    friday: parsed.friday,
                    saturday: parsed.saturday,
                    sunday: parsed.sunday
                };
            });

            if (averages.length === 0) {
                continue;
            }

            await nango.batchSave(averages, 'Average');

            for (const average of averages) {
                if (maxDate === undefined || average.date > maxDate) {
                    maxDate = average.date;
                }
            }
        }

        if (maxDate !== undefined) {
            await nango.saveCheckpoint({ date_min: maxDate });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
