import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('Airtable base ID. Example: "app1234567890"'),
    tableIdOrName: z.string().describe('Table ID or name. Example: "tbl1234567890" or "Apartments"'),
    name: z.string().optional().describe('New name for the table.'),
    description: z.string().max(20000).optional().describe('New description for the table. Maximum 20,000 characters.'),
    dateDependencySettings: z
        .object({
            enabled: z.boolean(),
            fieldIds: z.array(z.string()).optional()
        })
        .optional()
        .describe('Date dependency settings for the table.')
});

const DateDependencySettingsSchema = z
    .object({
        enabled: z.boolean(),
        fieldIds: z.array(z.string()).optional()
    })
    .optional();

const FieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional().nullable(),
    options: z.unknown().optional()
});

const ViewSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
});

const TableSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    primaryFieldId: z.string(),
    fields: z.array(FieldSchema),
    views: z.array(ViewSchema),
    dateDependencySettings: DateDependencySettingsSchema.optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    primaryFieldId: z.string(),
    fields: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            type: z.string(),
            description: z.string().optional(),
            options: z.unknown().optional()
        })
    ),
    views: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            type: z.string()
        })
    ),
    dateDependencySettings: DateDependencySettingsSchema
});

const action = createAction({
    description: 'Update metadata for an Airtable table.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-table',
        group: 'Tables'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schema.bases:read', 'schema.bases:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.name !== undefined) {
            body['name'] = input.name;
        }
        if (input.description !== undefined) {
            body['description'] = input.description;
        }
        if (input.dateDependencySettings !== undefined) {
            body['dateDependencySettings'] = input.dateDependencySettings;
        }

        // https://airtable.com/developers/web/api/update-table
        const response = await nango.patch({
            endpoint: `/v0/meta/bases/${input.baseId}/tables/${input.tableIdOrName}`,
            data: body,
            retries: 1
        });

        const table = TableSchema.parse(response.data);

        return {
            id: table.id,
            name: table.name,
            ...(table.description != null && { description: table.description }),
            primaryFieldId: table.primaryFieldId,
            fields: table.fields.map((field) => ({
                id: field.id,
                name: field.name,
                type: field.type,
                ...(field.description != null && { description: field.description }),
                ...(field.options !== undefined && { options: field.options })
            })),
            views: table.views.map((view) => ({
                id: view.id,
                name: view.name,
                type: view.type
            })),
            ...(table.dateDependencySettings != null && {
                dateDependencySettings: table.dateDependencySettings
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
