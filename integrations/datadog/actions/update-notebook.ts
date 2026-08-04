import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    notebook_id: z.union([z.number(), z.string()]).describe('Notebook ID. Example: 15174764'),
    name: z.string().optional(),
    cells: z.array(z.object({}).passthrough()).optional(),
    time: z.object({}).passthrough().optional(),
    status: z.string().optional(),
    metadata: z.object({}).passthrough().optional(),
    template_variables: z.array(z.object({}).passthrough()).nullable().optional()
});

const ProviderNotebookSchema = z.object({
    data: z.object({
        id: z.union([z.number(), z.string()]),
        type: z.string(),
        attributes: z.object({
            name: z.string(),
            cells: z.array(z.object({}).passthrough()),
            time: z.union([z.object({}).passthrough(), z.null()]),
            status: z.string().optional(),
            created: z.string().optional(),
            modified: z.string().optional(),
            author: z.object({}).passthrough().optional(),
            metadata: z.object({}).passthrough().optional(),
            template_variables: z.array(z.object({}).passthrough()).nullable().optional()
        })
    })
});

const OutputSchema = z.object({
    notebook_id: z.union([z.number(), z.string()]),
    name: z.string(),
    cells: z.array(z.object({}).passthrough()),
    time: z.union([z.object({}).passthrough(), z.null()]).optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    author: z.object({}).passthrough().optional(),
    metadata: z.object({}).passthrough().optional(),
    template_variables: z.array(z.object({}).passthrough()).nullable().optional()
});

const action = createAction({
    description: "Update a notebook's name, cells, or time range.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const notebookId = String(input.notebook_id);

        // https://docs.datadoghq.com/api/latest/notebooks/#get-a-notebook
        const getResponse = await nango.get({
            endpoint: `v1/notebooks/${encodeURIComponent(notebookId)}`,
            retries: 3
        });

        if (!getResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Notebook not found',
                notebook_id: notebookId
            });
        }

        const existingNotebook = ProviderNotebookSchema.parse(getResponse.data);
        const existingAttributes = existingNotebook.data.attributes;

        const updateBody = {
            data: {
                type: 'notebooks',
                attributes: {
                    name: input.name !== undefined ? input.name : existingAttributes.name,
                    cells: input.cells !== undefined ? input.cells : existingAttributes.cells,
                    time: input.time !== undefined ? input.time : existingAttributes.time,
                    ...(input.status !== undefined && { status: input.status }),
                    ...(input.metadata !== undefined && { metadata: input.metadata }),
                    ...(input.template_variables !== undefined && { template_variables: input.template_variables })
                }
            }
        };

        // https://docs.datadoghq.com/api/latest/notebooks/#update-a-notebook
        const response = await nango.put({
            endpoint: `v1/notebooks/${encodeURIComponent(notebookId)}`,
            data: updateBody,
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Notebook update returned no data',
                notebook_id: notebookId
            });
        }

        const updatedNotebook = ProviderNotebookSchema.parse(response.data);
        const attrs = updatedNotebook.data.attributes;

        return {
            notebook_id: updatedNotebook.data.id,
            name: attrs.name,
            cells: attrs.cells,
            ...(attrs.time !== undefined && { time: attrs.time }),
            ...(attrs.status !== undefined && { status: attrs.status }),
            ...(attrs.created !== undefined && { created_at: attrs.created }),
            ...(attrs.modified !== undefined && { modified_at: attrs.modified }),
            ...(attrs.author !== undefined && { author: attrs.author }),
            ...(attrs.metadata !== undefined && { metadata: attrs.metadata }),
            ...(attrs.template_variables !== undefined && { template_variables: attrs.template_variables })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
