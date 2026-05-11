import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('Airtable base ID. Example: "appXXXXXXXXXXXXXX"')
});

const ViewSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        type: z.string()
    })
    .passthrough();

const FieldSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        description: z.string().optional(),
        options: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const TableSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        primaryFieldId: z.string(),
        fields: z.array(FieldSchema),
        views: z.array(ViewSchema)
    })
    .passthrough();

const OutputSchema = z.object({
    tables: z.array(TableSchema)
});

const action = createAction({
    description: 'Retrieve Airtable base schema metadata including tables and fields.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-base-schema',
        group: 'Metadata'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schema.bases:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/get-base-schema
            endpoint: `/v0/meta/bases/${input.baseId}/tables`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Base schema not found',
                baseId: input.baseId
            });
        }

        const providerData = OutputSchema.parse(response.data);
        return providerData;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
