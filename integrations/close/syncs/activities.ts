import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderActivitySchema = z.object({
    id: z.string(),
    _type: z.string(),
    lead_id: z.string().nullish(),
    contact_id: z.string().nullish(),
    user_id: z.string().nullish(),
    activity_at: z.string().nullish(),
    date_updated: z.string()
});

const ActivitySchema = z.object({
    id: z.string(),
    _type: z.string(),
    lead_id: z.string().optional(),
    contact_id: z.string().optional(),
    user_id: z.string().optional(),
    activity_at: z.string().optional(),
    date_updated: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Incrementally sync all activity types using date_updated checkpoints.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Activity: ActivitySchema
    },
    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint ?? { updated_after: '' });
        if (!parsedCheckpoint.success) {
            throw new Error(`Failed to parse checkpoint: ${parsedCheckpoint.error.message}`);
        }
        const updatedAfter = parsedCheckpoint.data.updated_after;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.close.com/api/resources/activities/list
            endpoint: '/v1/activity/',
            params: {
                ...(updatedAfter && { date_updated__gt: updatedAfter })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '_skip',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '_limit',
                limit: 100,
                response_path: 'data'
            },
            retries: 3
        };

        let maxUpdatedAt: string | undefined = updatedAfter;

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderActivitySchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse activities: ${parsed.error.message}`);
            }

            const records = parsed.data.map((record) => ({
                id: record.id,
                _type: record._type,
                ...(record.lead_id != null && { lead_id: record.lead_id }),
                ...(record.contact_id != null && { contact_id: record.contact_id }),
                ...(record.user_id != null && { user_id: record.user_id }),
                ...(record.activity_at != null && { activity_at: record.activity_at }),
                date_updated: record.date_updated
            }));

            if (records.length === 0) {
                continue;
            }

            await nango.batchSave(records, 'Activity');

            for (const record of records) {
                if (maxUpdatedAt === undefined || record.date_updated > maxUpdatedAt) {
                    maxUpdatedAt = record.date_updated;
                }
            }

            if (maxUpdatedAt !== undefined) {
                await nango.saveCheckpoint({ updated_after: maxUpdatedAt });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
