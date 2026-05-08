import type { ProxyConfiguration } from 'nango';
import { createSync } from 'nango';
import { z } from 'zod';

const ProviderBaseSchema = z.object({
    id: z.string()
});

const ProviderViewSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional()
});

const TableSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    primaryFieldId: z.string().optional(),
    views: z.array(ProviderViewSchema).optional()
});

const ViewSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    base_id: z.string(),
    table_id: z.string(),
    table_name: z.string().optional()
});

type ProviderBase = z.infer<typeof ProviderBaseSchema>;

const sync = createSync({
    description: 'Sync Airtable views for bases and tables in scope.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    models: {
        View: ViewSchema
    },
    scopes: ['schema.bases:read'],

    endpoints: [
        {
            method: 'GET',
            path: '/syncs/views'
        }
    ],

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/list-bases
            endpoint: '/v0/meta/bases',
            retries: 10,
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'offset',
                cursor_name_in_request: 'offset',
                response_path: 'bases'
            }
        };

        await nango.trackDeletesStart('View');

        for await (const page of nango.paginate<ProviderBase>(config)) {
            const allViews: z.infer<typeof ViewSchema>[] = [];

            for (const base of page) {
                const tablesResponse = await nango.get({
                    // https://airtable.com/developers/web/api/get-base-schema
                    // Returns tables including their views as embedded metadata.
                    endpoint: `/v0/meta/bases/${base.id}/tables`,
                    retries: 3
                });

                const tablesData = z.object({ tables: z.array(TableSchema) }).parse(tablesResponse.data);

                for (const table of tablesData.tables) {
                    const tableViews = table.views ?? [];
                    const views = tableViews.map((view) => ({
                        id: view.id,
                        ...(view.name != null && { name: view.name }),
                        ...(view.type != null && { type: view.type }),
                        base_id: base.id,
                        table_id: table.id,
                        ...(table.name != null && { table_name: table.name })
                    }));

                    allViews.push(...views);
                }
            }

            if (allViews.length > 0) {
                await nango.batchSave(allViews, 'View');
            }
        }

        await nango.trackDeletesEnd('View');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
