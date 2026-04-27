import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the base. Example: "app1234567890abcd"'),
    tableId: z.string().describe('The ID or name of the table. Example: "tbl1234567890abcd" or "Table Name"'),
    fieldId: z.string().describe('The ID of the field to update. Example: "fld1234567890abcd"'),
    name: z.string().optional().describe('The new name for the field.'),
    description: z.string().nullable().optional().describe('The new description for the field. Pass null to clear the description.')
});

const ProviderFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional()
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
    scopes: ['schema.bases:read', 'schema.bases:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: { name?: string; description?: string | null } = {};

        if (input.name !== undefined) {
            requestBody.name = input.name;
        }

        if (input.description !== undefined) {
            requestBody.description = input.description;
        }

        if (Object.keys(requestBody).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of "name" or "description" must be provided to update the field.'
            });
        }

        // https://airtable.com/developers/web/api/update-field
        const response = await nango.patch({
            endpoint: `/v0/meta/bases/${input.baseId}/tables/${input.tableId}/fields/${input.fieldId}`,
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Field not found or could not be updated.',
                baseId: input.baseId,
                tableId: input.tableId,
                fieldId: input.fieldId
            });
        }

        const providerField = ProviderFieldSchema.parse(response.data);

        return {
            id: providerField.id,
            name: providerField.name,
            type: providerField.type,
            ...(providerField.description != null && { description: providerField.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
