import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "app1234567890abcd"'),
    viewId: z.string().describe('The ID of the view to retrieve metadata for. Example: "viw1234567890abcd"')
});

const ViewMetadataSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
});

const ProviderTableSchema = z.object({
    id: z.string(),
    name: z.string(),
    views: z.array(ViewMetadataSchema).optional()
});

const ProviderTablesResponseSchema = z.object({
    tables: z.array(ProviderTableSchema)
});

const action = createAction({
    description: 'Retrieve metadata for an Airtable view',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-view-metadata',
        group: 'Views'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/get-base-schema
        // The direct /v0/meta/bases/{baseId}/views/{viewId} endpoint requires
        // special developer permissions. We use the tables endpoint instead
        // and search for the view within the response.
        const response = await nango.get({
            endpoint: `/v0/meta/bases/${input.baseId}/tables`,
            retries: 3
        });

        const providerData = ProviderTablesResponseSchema.parse(response.data);

        for (const table of providerData.tables) {
            const views = table.views || [];
            const view = views.find((v) => v.id === input.viewId);
            if (view) {
                return {
                    id: view.id,
                    name: view.name,
                    type: view.type
                };
            }
        }

        throw new nango.ActionError({
            type: 'not_found',
            message: 'View not found',
            baseId: input.baseId,
            viewId: input.viewId
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
