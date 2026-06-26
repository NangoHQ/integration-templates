import { createSync } from 'nango';
import { z } from 'zod';

const ItemGroupSchema = z.object({
    id: z.string(),
    code: z.string().optional(),
    description: z.string().optional(),
    modified: z.string().optional()
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number()
            })
        )
    })
});

const ItemGroupRecordSchema = z.object({
    ID: z.string(),
    Code: z.string().optional(),
    Description: z.string().optional(),
    Modified: z.string().optional()
});

const ItemGroupsResponseSchema = z.union([
    z.object({
        d: z.array(ItemGroupRecordSchema)
    }),
    z.object({
        d: z.object({
            results: z.array(ItemGroupRecordSchema)
        })
    })
]);

const sync = createSync({
    description: 'Sync item groups as full snapshot (small static dataset).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        ItemGroup: ItemGroupSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/item-groups'
        }
    ],

    exec: async (nango) => {
        // https://start.exactonline.fr/docs/en_GB/rest/webservices/system/me.xml
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        const meResult = meData.d.results[0];
        if (!meResult) {
            throw new Error('No results returned from Me endpoint');
        }
        const currentDivision = meResult.CurrentDivision;

        // Blocker: Exact Online ItemGroups is a small static dataset.
        // Full refresh is used because the dataset is small and static.
        await nango.trackDeletesStart('ItemGroup');

        const limit = 100;
        let skip = 0;
        let hasMore = true;

        while (hasMore) {
            // https://start.exactonline.fr/docs/en_GB/rest/webservices/logistics/ItemGroups.xml
            const response = await nango.get({
                endpoint: `/api/v1/${encodeURIComponent(currentDivision)}/logistics/ItemGroups`,
                params: {
                    $select: 'ID,Code,Description,Modified',
                    $orderby: 'ID asc',
                    $top: String(limit),
                    $skip: String(skip)
                },
                retries: 3
            });

            const data = ItemGroupsResponseSchema.parse(response.data);
            const items = 'results' in data.d ? data.d.results : data.d;
            const records = items.map((record) => ({
                id: record.ID,
                ...(record.Code != null && { code: record.Code }),
                ...(record.Description != null && { description: record.Description }),
                ...(record.Modified != null && { modified: record.Modified })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'ItemGroup');
            }

            if (items.length < limit) {
                hasMore = false;
            }

            skip += limit;
        }

        await nango.trackDeletesEnd('ItemGroup');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
