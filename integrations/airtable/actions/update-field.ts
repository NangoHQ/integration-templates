import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the base containing the field. Example: "app1234567890"'),
    tableId: z.string().describe('The ID of the table containing the field. Example: "tbltp8DGLhqbUmjK1"'),
    columnId: z.string().describe('The ID of the field (column) to update. Example: "fld1VnoyuotSTyxW1"'),
    name: z.string().optional().describe('The new name for the field.'),
    description: z
        .string()
        .nullable()
        .optional()
        .describe('The new description for the field. If provided, must be a string no longer than 20,000 characters. Pass null to clear the description.'),
    options: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Field-type-specific options to update. Only certain options are mutable depending on the field type.')
});

const ProviderFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().nullable().optional(),
    options: z.unknown().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    options: z.unknown().optional()
});

const action = createAction({
    description: 'Update metadata for an Airtable field.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-field',
        group: 'Fields'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:write', 'schema.bases:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {};

        if (input.name !== undefined) {
            payload['name'] = input.name;
        }
        if (input.description !== undefined) {
            payload['description'] = input.description;
        }
        if (input.options !== undefined) {
            payload['options'] = input.options;
        }

        // https://airtable.com/developers/web/api/update-field
        const response = await nango.patch({
            endpoint: `/v0/meta/bases/${input.baseId}/tables/${input.tableId}/fields/${input.columnId}`,
            data: payload,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Airtable API',
                response_data: response.data
            });
        }

        const providerField = ProviderFieldSchema.parse(response.data);

        return {
            id: providerField.id,
            name: providerField.name,
            type: providerField.type,
            ...(providerField.description != null && { description: providerField.description }),
            ...(providerField.options !== undefined && { options: providerField.options })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
