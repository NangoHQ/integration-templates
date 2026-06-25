import { createSync } from 'nango';
import { z } from 'zod';

const ItemSchema = z.object({
    id: z.string().describe('The Exact Online item ID'),
    Code: z.string().optional(),
    Description: z.string().optional(),
    ItemGroup: z.string().optional(),
    IsSalesItem: z.boolean().optional(),
    IsPurchaseItem: z.boolean().optional(),
    CostPriceStandard: z.number().optional(),
    Modified: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MeResponseSchema = z.object({
    d: z.object({
        CurrentDivision: z.number().optional(),
        results: z.array(z.object({ CurrentDivision: z.number().optional() })).optional()
    })
});

const ItemResponseSchema = z.object({
    ID: z.string(),
    Code: z.string().optional().nullable(),
    Description: z.string().optional().nullable(),
    ItemGroup: z.string().optional().nullable(),
    IsSalesItem: z.boolean().optional().nullable(),
    IsPurchaseItem: z.boolean().optional().nullable(),
    CostPriceStandard: z.number().optional().nullable(),
    Modified: z.string()
});

const ItemsApiResponseSchema = z.object({
    d: z.union([z.array(z.unknown()), z.object({ results: z.array(z.unknown()) })])
});

function exactDateToFilterValue(dateString: string): string {
    const match = dateString.match(/\/Date\((\d+)\)\//);
    if (match) {
        const iso = new Date(Number(match[1])).toISOString();
        return iso.slice(0, 19);
    }
    return dateString;
}

const sync = createSync({
    description: 'Sync logistics items/products with incremental updates.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Item: ItemSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/items'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-rest-api
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        let division: number | undefined;
        const firstResult = meData.d.results?.[0];
        if (firstResult) {
            division = firstResult.CurrentDivision;
        } else {
            division = meData.d.CurrentDivision;
        }

        if (!division) {
            throw new Error('CurrentDivision not found in Me response');
        }

        const updatedAfter = checkpoint?.updated_after ? exactDateToFilterValue(checkpoint.updated_after) : undefined;

        const limit = 100;
        let skip = 0;
        let hasMore = true;

        while (hasMore) {
            const params: Record<string, string | number> = {
                $select: 'ID,Code,Description,ItemGroup,IsSalesItem,IsPurchaseItem,CostPriceStandard,Modified',
                $orderby: 'Modified asc',
                $top: limit,
                $skip: skip
            };

            if (updatedAfter) {
                params['$filter'] = `Modified gt datetime'${updatedAfter}'`;
            }

            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-rest-api
            const response = await nango.get({
                endpoint: `/api/v1/${encodeURIComponent(String(division))}/logistics/Items`,
                params,
                retries: 3
            });

            const responseData = ItemsApiResponseSchema.parse(response.data);
            let rawItems: Array<unknown>;
            if (Array.isArray(responseData.d)) {
                rawItems = responseData.d;
            } else {
                rawItems = responseData.d.results;
            }

            const items: Array<z.infer<typeof ItemSchema>> = [];
            let lastModified: string | undefined;

            for (const raw of rawItems) {
                const parsed = ItemResponseSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse item: ${parsed.error.message}`);
                }

                const record = parsed.data;
                items.push({
                    id: record.ID,
                    ...(record.Code != null && { Code: record.Code }),
                    ...(record.Description != null && { Description: record.Description }),
                    ...(record.ItemGroup != null && { ItemGroup: record.ItemGroup }),
                    ...(record.IsSalesItem != null && { IsSalesItem: record.IsSalesItem }),
                    ...(record.IsPurchaseItem != null && { IsPurchaseItem: record.IsPurchaseItem }),
                    ...(record.CostPriceStandard != null && { CostPriceStandard: record.CostPriceStandard }),
                    Modified: record.Modified
                });
                lastModified = exactDateToFilterValue(record.Modified);
            }

            if (items.length > 0) {
                await nango.batchSave(items, 'Item');

                if (lastModified) {
                    await nango.saveCheckpoint({
                        updated_after: lastModified
                    });
                }
            }

            if (rawItems.length < limit) {
                hasMore = false;
            } else {
                skip += rawItems.length;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
