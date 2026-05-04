import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    base_id: z.string().describe('Airtable base ID. Example: "app1234567890abcd"'),
    table_id: z.string().describe('Airtable table ID. Example: "tbl1234567890abcd"'),
    name: z.string().describe('Name of the new field.'),
    type: z.string().describe('Airtable field type. Example: "singleLineText", "number", "singleSelect"'),
    description: z.string().optional().describe('Description for the field.'),
    options: z.record(z.string(), z.unknown()).optional().describe('Field-type-specific options.')
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
        const requestBody: Record<string, unknown> = {
            name: input.name,
            type: input.type
        };

        if (input.description !== undefined) {
            requestBody['description'] = input.description;
        }

        if (input.options !== undefined) {
            requestBody['options'] = input.options;
        }

        const response = await nango.post({
            // https://airtable.com/developers/web/api/create-field
            endpoint: `/v0/meta/bases/${input.base_id}/tables/${input.table_id}/fields`,
            data: requestBody,
            retries: 3
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
