import { z } from 'zod';
import { createAction } from 'nango';

const FieldConfigSchema = z.object({
    name: z.string().describe('Field name'),
    type: z.string().describe('Field type (e.g., singleLineText, singleSelect, number, checkbox, email, url, multilineText, date, dateTime)'),
    description: z.string().optional().describe('Field description'),
    options: z.object({}).passthrough().optional()
});

const InputSchema = z.object({
    base_id: z.string().describe('Airtable base ID. Example: app1234567890ABC'),
    name: z.string().describe('Table name'),
    description: z.string().optional().describe('Table description (max 20k characters)'),
    fields: z
        .array(FieldConfigSchema)
        .min(1)
        .describe(
            'Array of field definitions. At least one field is required. Each field must have name, type, and optional description and options. Field types: singleLineText, singleSelect, number, checkbox, email, url, multilineText, date, dateTime, etc. Options vary by type (e.g., {precision: 2} for number, {choices: [{name: "Option 1"}]} for singleSelect)'
        ),
    primary_field_name: z.string().optional().describe('Name of the field to use as the primary field. If omitted, the first field will be used.')
});

const TableFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    primary_field_id: z.string(),
    fields: z.array(TableFieldSchema)
});

// Provider response schema for validation
const ProviderResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    primaryFieldId: z.string(),
    fields: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            type: z.string(),
            description: z.string().optional().nullable()
        })
    )
});

const action = createAction({
    description: 'Create a new table in an Airtable base',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-table',
        group: 'Tables'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schema.bases:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Get first field name for default primary field
        const firstFieldName = input.fields[0]?.name;
        if (!firstFieldName) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one field is required'
            });
        }

        // Determine the primary field name (default to first field)
        const primaryFieldName = input.primary_field_name || firstFieldName;

        // Validate that the primary field exists in the fields array
        const primaryField = input.fields.find((f) => f.name === primaryFieldName);
        if (!primaryField) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: `Primary field "${primaryFieldName}" not found in fields array`
            });
        }

        // Build the fields array for the request
        const requestFields = input.fields.map((field) => {
            const fieldData: Record<string, unknown> = {
                name: field.name,
                type: field.type
            };
            if (field.description !== undefined) {
                fieldData['description'] = field.description;
            }
            if (field.options !== undefined) {
                fieldData['options'] = field.options;
            }
            return fieldData;
        });

        // Build the request payload
        const payload: Record<string, unknown> = {
            name: input.name,
            fields: requestFields
        };

        if (input.description !== undefined) {
            payload['description'] = input.description;
        }

        // https://airtable.com/developers/web/api/create-table
        const response = await nango.post({
            endpoint: `/v0/meta/bases/${input.base_id}/tables`,
            data: payload,
            retries: 3
        });

        const responseData = ProviderResponseSchema.parse(response.data);

        // Map the provider response to output schema
        return {
            id: responseData.id,
            name: responseData.name,
            description: responseData.description,
            primary_field_id: responseData.primaryFieldId,
            fields: responseData.fields.map((field) => ({
                id: field.id,
                name: field.name,
                type: field.type,
                description: field.description
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
