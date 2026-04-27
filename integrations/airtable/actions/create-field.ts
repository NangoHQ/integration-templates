import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('Airtable base ID. Example: "appXXXXXXXXXX"'),
    tableId: z.string().describe('Airtable table ID. Example: "tblXXXXXXXXXX"'),
    name: z.string().describe('The name of the new field.'),
    type: z.string().describe('The type of the new field. Example: "singleLineText", "number", "singleSelect"'),
    description: z.string().optional().describe('A long-form description of the field.'),
    options: z.record(z.string(), z.unknown()).optional().describe('Type-specific options for the field.')
});

const ProviderFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    options: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    options: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Create a new field on an Airtable table.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-field',
        group: 'Fields'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schema.bases:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://airtable.com/developers/web/api/create-field
            endpoint: `/v0/meta/bases/${input.baseId}/tables/${input.tableId}/fields`,
            data: {
                name: input.name,
                type: input.type,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.options !== undefined && { options: input.options })
            },
            retries: 1
        });

        const providerField = ProviderFieldSchema.parse(response.data);

        return {
            id: providerField.id,
            name: providerField.name,
            type: providerField.type,
            ...(providerField.description !== undefined && { description: providerField.description }),
            ...(providerField.options !== undefined && { options: providerField.options })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
