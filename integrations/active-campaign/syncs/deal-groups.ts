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

const sync = createSync({
    description: 'Sync deal groups (pipelines) from ActiveCampaign',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
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
        await nango.trackDeletesStart('DealGroup');

        for await (const page of nango.paginate({
            endpoint: '/3/dealGroups',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'dealGroups'
            },
            retries: 3
        })) {
            const parsed = z.array(ProviderDealGroupSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse deal groups: ${parsed.error.message}`);
            }

            const dealGroups = parsed.data.map((record) => ({
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

            if (dealGroups.length > 0) {
                await nango.batchSave(dealGroups, 'DealGroup');
            }
        }

        await nango.trackDeletesEnd('DealGroup');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
