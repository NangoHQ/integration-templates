import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination offset from the previous response. Omit for the first page.')
});

const ProviderBaseSchema = z.object({
    id: z.string(),
    name: z.string(),
    permissionLevel: z.string().optional()
});

const ProviderResponseSchema = z.object({
    bases: z.array(ProviderBaseSchema),
    offset: z.string().optional()
});

const BaseSchema = z.object({
    id: z.string(),
    name: z.string(),
    permissionLevel: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(BaseSchema),
    nextOffset: z.string().optional()
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
                ...(base.permissionLevel != null && { permissionLevel: base.permissionLevel })
            })),
            ...(providerResponse.offset != null && { nextOffset: providerResponse.offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
