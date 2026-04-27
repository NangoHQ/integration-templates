import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "app1234567890abcd"')
});

const FieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    options: z.record(z.string(), z.unknown()).optional()
});

const TableSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    primaryFieldId: z.string(),
    fields: z.array(FieldSchema)
});

const OutputSchema = z.object({
    tables: z.array(TableSchema)
});

const action = createAction({
    description: 'Retrieve Airtable base schema metadata including tables and fields',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-base-schema',
        group: 'Base Schema'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schema.bases:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/get-base-schema
        const response = await nango.get({
            endpoint: `/v0/meta/bases/${input.baseId}/tables`,
            retries: 3
        });

        const rawTables = z.array(z.record(z.string(), z.unknown())).parse(response.data['tables']);

        const tables = rawTables.map((rawTable: Record<string, unknown>) => {
            const rawFields = z.array(z.record(z.string(), z.unknown())).parse(rawTable['fields']);

            const fields = rawFields.map((rawField: Record<string, unknown>) => ({
                id: z.string().parse(rawField['id']),
                name: z.string().parse(rawField['name']),
                type: z.string().parse(rawField['type']),
                ...(rawField['description'] !== undefined && {
                    description: z.string().parse(rawField['description'])
                }),
                ...(rawField['options'] !== undefined && {
                    options: z.record(z.string(), z.unknown()).parse(rawField['options'])
                })
            }));

            return {
                id: z.string().parse(rawTable['id']),
                name: z.string().parse(rawTable['name']),
                primaryFieldId: z.string().parse(rawTable['primaryFieldId']),
                ...(rawTable['description'] !== undefined && {
                    description: z.string().parse(rawTable['description'])
                }),
                fields
            };
        });

        return { tables };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
