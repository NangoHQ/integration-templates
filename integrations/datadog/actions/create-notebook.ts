import { z } from 'zod';
import { createAction } from 'nango';

const NotebookTimeSchema = z.object({
    live_span: z.string().optional()
});

const InputSchema = z.object({
    name: z.string().describe('Notebook name. Example: "My Notebook"'),
    cells: z
        .array(
            z.object({
                text: z.string().describe('Markdown text for the cell. Example: "# Hello"')
            })
        )
        .describe('Array of markdown cells to include in the notebook'),
    time: NotebookTimeSchema.describe('Notebook time configuration. Example: {"live_span": "1h"}')
});

const ProviderNotebookDataSchema = z.object({
    id: z.union([z.string(), z.number()]),
    type: z.string().optional(),
    attributes: z
        .object({
            name: z.string().optional(),
            cells: z.array(z.unknown()).optional(),
            time: z.unknown().optional(),
            status: z.string().optional(),
            created_at: z.string().optional(),
            modified_at: z.string().optional(),
            url: z.string().optional()
        })
        .passthrough()
        .optional()
});

const ProviderNotebookResponseSchema = z.object({
    data: ProviderNotebookDataSchema.optional()
});

const OutputSchema = z.object({
    id: z.string().describe('Notebook ID'),
    name: z.string().optional(),
    cells: z.array(z.unknown()).optional(),
    time: z.unknown().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Create a new notebook',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['notebooks_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody = {
            data: {
                type: 'notebooks',
                attributes: {
                    name: input.name,
                    cells: input.cells.map((cell) => ({
                        type: 'notebook_cells',
                        attributes: {
                            definition: {
                                type: 'markdown',
                                text: cell.text
                            }
                        }
                    })),
                    time: input.time
                }
            }
        };

        // https://docs.datadoghq.com/api/latest/notebooks/#create-a-notebook
        const response = await nango.post({
            endpoint: 'v1/notebooks',
            data: requestBody,
            retries: 3
        });

        const parsed = ProviderNotebookResponseSchema.parse(response.data);
        const providerData = parsed.data;

        if (!providerData) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider response did not contain notebook data'
            });
        }

        const attributes = providerData.attributes || {};

        return {
            id: String(providerData.id),
            ...(attributes.name !== undefined && { name: attributes.name }),
            ...(attributes.cells !== undefined && { cells: attributes.cells }),
            ...(attributes.time !== undefined && { time: attributes.time }),
            ...(attributes.status !== undefined && { status: attributes.status }),
            ...(attributes.created_at !== undefined && { created_at: attributes.created_at }),
            ...(attributes.modified_at !== undefined && { modified_at: attributes.modified_at }),
            ...(attributes.url !== undefined && { url: attributes.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
