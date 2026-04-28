import { z } from 'zod';
import { createAction } from 'nango';

const DateDependencySettingsSchema = z.object({
    durationFieldId: z.string(),
    endDateFieldId: z.string(),
    holidays: z.array(z.string()).optional(),
    isEnabled: z.boolean(),
    predecessorFieldId: z.string().nullable(),
    reschedulingMode: z.string(),
    shouldSkipWeekendsAndHolidays: z.boolean(),
    startDateFieldId: z.string()
});

const InputSchema = z.object({
    baseId: z.string().describe('ID of the base. Example: "app1234567890"'),
    tableIdOrName: z.string().describe('Table ID or table name. Example: "tbltp8DGLhqbUmjK1"'),
    name: z.string().optional().describe('The new name for the table.'),
    description: z.string().max(20000).optional().describe('The new description for the table. Must be no longer than 20,000 characters.'),
    dateDependencySettings: DateDependencySettingsSchema.optional().describe('Date dependency settings for the table.')
});

const FieldOptionSchema = z.object({}).passthrough();

const FieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().nullable().optional(),
    options: FieldOptionSchema.nullable().optional()
});

const ViewSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
});

const ProviderTableSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    primaryFieldId: z.string(),
    fields: z.array(FieldSchema),
    views: z.array(ViewSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    primaryFieldId: z.string(),
    fields: z.array(FieldSchema),
    views: z.array(ViewSchema)
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
        interface UpdateTableRequest {
            name?: string;
            description?: string;
            dateDependencySettings?: z.infer<typeof DateDependencySettingsSchema>;
        }
        const requestBody: UpdateTableRequest = {};

        if (input.name !== undefined) {
            requestBody.name = input.name;
        }
        if (input.description !== undefined) {
            requestBody.description = input.description;
        }
        if (input.dateDependencySettings !== undefined) {
            requestBody.dateDependencySettings = input.dateDependencySettings;
        }

        const response = await nango.patch({
            // https://airtable.com/developers/web/api/update-table
            endpoint: `/v0/meta/bases/${input.baseId}/tables/${input.tableIdOrName}`,
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Table not found or base not accessible.',
                baseId: input.baseId,
                tableIdOrName: input.tableIdOrName
            });
        }

        const providerTable = ProviderTableSchema.parse(response.data);

        return {
            id: providerTable.id,
            name: providerTable.name,
            ...(providerTable.description != null && { description: providerTable.description }),
            primaryFieldId: providerTable.primaryFieldId,
            fields: providerTable.fields,
            views: providerTable.views
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
