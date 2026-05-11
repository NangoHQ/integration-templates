import { z } from 'zod';
import { createAction } from 'nango';

const FieldInputSchema = z.object({
    name: z.string().describe('Field name. Example: "Name"'),
    type: z.string().describe('Airtable field type. Example: "singleLineText"'),
    description: z.string().optional().describe('Field description. Must be no longer than 20k characters.'),
    options: z.record(z.string(), z.unknown()).optional().describe('Field-type-specific options.')
});

const TableInputSchema = z.object({
    name: z.string().describe('Table name. Example: "Table 1"'),
    description: z.string().optional().describe('Table description. Must be no longer than 20k characters.'),
    fields: z.array(FieldInputSchema).describe('Fields to create in this table.')
});

const InputSchema = z.object({
    workspaceId: z.string().describe('The ID of the workspace where the new base will live. Example: "wspXXXXXXXXXXXXXX"'),
    name: z.string().describe('The name to give to the new base. Does not need to be unique.'),
    tables: z.array(TableInputSchema).describe('Tables to create in the new base.')
});

const ProviderFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional()
});

const ProviderViewSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
});

const ProviderTableSchema = z.object({
    id: z.string(),
    name: z.string(),
    primaryFieldId: z.string(),
    fields: z.array(ProviderFieldSchema),
    views: z.array(ProviderViewSchema)
});

const ProviderOutputSchema = z.object({
    id: z.string(),
    tables: z.array(ProviderTableSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    tables: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            primaryFieldId: z.string(),
            fields: z.array(
                z.object({
                    id: z.string(),
                    name: z.string(),
                    type: z.string(),
                    description: z.string().optional()
                })
            ),
            views: z.array(
                z.object({
                    id: z.string(),
                    name: z.string(),
                    type: z.string()
                })
            )
        })
    )
});

const action = createAction({
    description: 'Create a new Airtable base in a workspace.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-base',
        group: 'Bases'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schema.bases:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/create-base
        const response = await nango.post({
            endpoint: '/v0/meta/bases',
            data: {
                workspaceId: input.workspaceId,
                name: input.name,
                tables: input.tables.map((table) => ({
                    name: table.name,
                    ...(table.description !== undefined && { description: table.description }),
                    fields: table.fields.map((field) => ({
                        name: field.name,
                        type: field.type,
                        ...(field.description !== undefined && { description: field.description }),
                        ...(field.options !== undefined && { options: field.options })
                    }))
                }))
            },
            retries: 3
        });

        const providerOutput = ProviderOutputSchema.parse(response.data);

        return {
            id: providerOutput.id,
            tables: providerOutput.tables.map((table) => ({
                id: table.id,
                name: table.name,
                primaryFieldId: table.primaryFieldId,
                fields: table.fields.map((field) => ({
                    id: field.id,
                    name: field.name,
                    type: field.type,
                    ...(field.description !== undefined && { description: field.description })
                })),
                views: table.views.map((view) => ({
                    id: view.id,
                    name: view.name,
                    type: view.type
                }))
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
