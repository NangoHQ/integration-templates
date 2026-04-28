import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    base_id: z.string().describe('Airtable base ID. Example: "appXXXXXXXXXXXXXX"')
});

const ProviderViewSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        type: z.string()
    })
    .passthrough();

const ProviderTableSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        views: z.array(ProviderViewSchema)
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    tables: z.array(ProviderTableSchema)
});

const ViewSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
});

const OutputSchema = z.object({
    views: z.array(ViewSchema)
});

const action = createAction({
    description: 'List views available in an Airtable base.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-views',
        group: 'Views'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schema.bases:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://airtable.com/developers/web/api/get-base-schema
            endpoint: `/v0/meta/bases/${input.base_id}/tables`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Base not found or not accessible',
                base_id: input.base_id
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        const views: z.infer<typeof ViewSchema>[] = [];
        for (const table of providerData.tables) {
            for (const view of table.views) {
                views.push({
                    id: view.id,
                    name: view.name,
                    type: view.type
                });
            }
        }

        return {
            views
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
