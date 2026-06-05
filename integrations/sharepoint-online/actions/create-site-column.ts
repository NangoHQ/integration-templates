import { z } from 'zod';
import { createAction } from 'nango';

const TextColumnSchema = z.object({
    allowMultipleLines: z.boolean().optional(),
    appendChangesToExistingText: z.boolean().optional(),
    linesForEditing: z.number().optional(),
    maxLength: z.number().optional()
});

const NumberColumnSchema = z.object({
    decimalPlaces: z.string().optional(),
    displayAs: z.string().optional(),
    maximum: z.number().optional(),
    minimum: z.number().optional()
});

const DateTimeColumnSchema = z.object({
    displayAs: z.string().optional(),
    format: z.string().optional()
});

const ChoiceColumnSchema = z.object({
    allowTextEntry: z.boolean().optional(),
    choices: z.array(z.string()).optional(),
    displayAs: z.string().optional()
});

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('SharePoint site ID. Example: "contoso.sharepoint.com,12345678-1234-1234-1234-123456789012,12345678-1234-1234-1234-123456789012"'),
    name: z.string().describe('The API-facing name of the column.'),
    description: z.string().optional().describe('The user-facing description of the column.'),
    text: TextColumnSchema.optional().describe('Text column type configuration.'),
    number: NumberColumnSchema.optional().describe('Number column type configuration.'),
    dateTime: DateTimeColumnSchema.optional().describe('DateTime column type configuration.'),
    choice: ChoiceColumnSchema.optional().describe('Choice column type configuration.')
});

const ProviderColumnSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional(),
        displayName: z.string().optional(),
        description: z.string().optional(),
        text: z.record(z.string(), z.unknown()).optional(),
        number: z.record(z.string(), z.unknown()).optional(),
        dateTime: z.record(z.string(), z.unknown()).optional(),
        choice: z.record(z.string(), z.unknown()).optional(),
        hidden: z.boolean().optional(),
        indexed: z.boolean().optional(),
        enforceUniqueValues: z.boolean().optional(),
        readOnly: z.boolean().optional(),
        required: z.boolean().optional(),
        columnGroup: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    text: z.record(z.string(), z.unknown()).optional(),
    number: z.record(z.string(), z.unknown()).optional(),
    dateTime: z.record(z.string(), z.unknown()).optional(),
    choice: z.record(z.string(), z.unknown()).optional(),
    hidden: z.boolean().optional(),
    indexed: z.boolean().optional(),
    enforceUniqueValues: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    required: z.boolean().optional(),
    columnGroup: z.string().optional()
});

const action = createAction({
    description: 'Create a site-level column definition on a SharePoint site.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-site-column',
        group: 'Columns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            name: input.name,
            ...(input.description !== undefined && { description: input.description }),
            ...(input.text !== undefined && { text: input.text }),
            ...(input.number !== undefined && { number: input.number }),
            ...(input.dateTime !== undefined && { dateTime: input.dateTime }),
            ...(input.choice !== undefined && { choice: input.choice })
        };

        const response = await nango.post({
            // https://learn.microsoft.com/graph/api/site-post-columns
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/columns`,
            data: body,
            retries: 3
        });

        const providerColumn = ProviderColumnSchema.parse(response.data);

        return {
            ...(providerColumn.id !== undefined && { id: providerColumn.id }),
            ...(providerColumn.name !== undefined && { name: providerColumn.name }),
            ...(providerColumn.displayName !== undefined && { displayName: providerColumn.displayName }),
            ...(providerColumn.description !== undefined && { description: providerColumn.description }),
            ...(providerColumn.text !== undefined && { text: providerColumn.text }),
            ...(providerColumn.number !== undefined && { number: providerColumn.number }),
            ...(providerColumn.dateTime !== undefined && { dateTime: providerColumn.dateTime }),
            ...(providerColumn.choice !== undefined && { choice: providerColumn.choice }),
            ...(providerColumn.hidden !== undefined && { hidden: providerColumn.hidden }),
            ...(providerColumn.indexed !== undefined && { indexed: providerColumn.indexed }),
            ...(providerColumn.enforceUniqueValues !== undefined && { enforceUniqueValues: providerColumn.enforceUniqueValues }),
            ...(providerColumn.readOnly !== undefined && { readOnly: providerColumn.readOnly }),
            ...(providerColumn.required !== undefined && { required: providerColumn.required }),
            ...(providerColumn.columnGroup !== undefined && { columnGroup: providerColumn.columnGroup })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
