import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination offset from the previous response. Omit for the first page.')
});

const BaseSchema = z.object({
    id: z.string().describe('Unique identifier for the base. Example: "appSW9R1uQiZoiTtm"'),
    name: z.string().describe('Name of the base.'),
    permissionLevel: z.string().describe('Permission level the authenticated user has on this base. Example: "create"')
});

const ProviderResponseSchema = z.object({
    bases: z.array(BaseSchema),
    offset: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            permissionLevel: z.string()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List Airtable bases accessible to the authenticated user.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-bases',
        group: 'Bases'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schema.bases:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://airtable.com/developers/web/api/list-bases
            endpoint: '/v0/meta/bases',
            params: {
                ...(input.cursor && { offset: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.bases.map((base) => ({
                id: base.id,
                name: base.name,
                permissionLevel: base.permissionLevel
            })),
            ...(providerResponse.offset != null && { next_cursor: providerResponse.offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
