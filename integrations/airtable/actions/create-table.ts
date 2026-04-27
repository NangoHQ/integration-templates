import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const FieldSchema = z.object({
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    options: z.record(z.string(), z.unknown()).optional()
});

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the base to create the table in. Example: "app1234567890abcd"'),
    name: z.string().describe('The name of the table. Example: "Tasks"'),
    description: z.string().optional().describe('A description for the table. Must be no longer than 20k characters.'),
    fields: z.array(FieldSchema).describe('An array of field definitions conforming to the Airtable field model.'),
    primaryFieldId: z.string().optional().describe('The ID of the field to use as the primary field. If omitted, the first field becomes the primary field.')
});

const ViewSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
});

const FieldResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    options: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    primaryFieldId: z.string(),
    fields: z.array(FieldResponseSchema),
    views: z.array(ViewSchema)
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
        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/create-table
            endpoint: `/v0/meta/bases/${input.baseId}/tables`,
            data: {
                name: input.name,
                fields: input.fields,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.primaryFieldId !== undefined && { primaryFieldId: input.primaryFieldId })
            },
            retries: 10
        };

        const response = await nango.post(config);

        const table = OutputSchema.parse(response.data);

        return table;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
