import { createSync } from 'nango';
import { z } from 'zod';

const ProviderDealGroupSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    currency: z.string().nullable().optional(),
    autoassign: z.string().nullable().optional(),
    allgroups: z.string().nullable().optional(),
    allusers: z.string().nullable().optional(),
    cdate: z.string().nullable().optional(),
    udate: z.string().nullable().optional(),
    stages: z.array(z.string()).nullable().optional(),
    links: z.record(z.string(), z.string()).nullable().optional()
});

const DealGroupSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    currency: z.string().optional(),
    autoassign: z.string().optional(),
    allgroups: z.string().optional(),
    allusers: z.string().optional(),
    cdate: z.string().optional(),
    udate: z.string().optional(),
    stages: z.array(z.string()).optional(),
    links: z.record(z.string(), z.string()).optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().nonnegative()
});

const DealGroupsResponseSchema = z.object({
    dealGroups: z.array(ProviderDealGroupSchema)
});

const sync = createSync({
    description: 'Sync deal groups (pipelines) from ActiveCampaign',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        DealGroup: DealGroupSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/deal-groups'
        }
    ],

    exec: async (nango) => {
        // https://developers.activecampaign.com/reference/list-all-pipelines
        // Blocker: ActiveCampaign's dealGroups endpoint does not support
        // changed-since filtering, cursors, or since_id parameters.
        // Only title and have_stages filters are documented, so full
        // refresh is required.
        const checkpointRaw = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(checkpointRaw);
        let offset = checkpointResult.success ? (checkpointResult.data.offset ?? 0) : 0;
        const limit = 100;

        await nango.trackDeletesStart('DealGroup');

        while (true) {
            const response = await nango.get({
                // https://developers.activecampaign.com/reference/list-all-pipelines
                endpoint: '/3/dealGroups',
                params: {
                    limit,
                    offset
                },
                retries: 3
            });

            const parsedResponse = DealGroupsResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Failed to parse deal groups response: ${parsedResponse.error.message}`);
            }

            const { dealGroups } = parsedResponse.data;

            if (dealGroups.length > 0) {
                const mapped = dealGroups.map((record) => ({
                    id: record.id,
                    ...(record.title != null && { title: record.title }),
                    ...(record.currency != null && { currency: record.currency }),
                    ...(record.autoassign != null && { autoassign: record.autoassign }),
                    ...(record.allgroups != null && { allgroups: record.allgroups }),
                    ...(record.allusers != null && { allusers: record.allusers }),
                    ...(record.cdate != null && { cdate: record.cdate }),
                    ...(record.udate != null && { udate: record.udate }),
                    ...(record.stages != null && { stages: record.stages }),
                    ...(record.links != null && { links: record.links })
                }));

                await nango.batchSave(mapped, 'DealGroup');
            }

            const nextOffset = offset + limit;
            await nango.saveCheckpoint({ offset: nextOffset });

            if (dealGroups.length < limit) {
                break;
            }

            offset = nextOffset;
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('DealGroup');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
