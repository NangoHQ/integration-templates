import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Document ID. Example: 192568972'),
    title: z.string().optional().describe('New document title.'),
    url: z.string().optional().describe('New file URL. Required when updating the title.')
});

const ProviderDocumentSchema = z.object({
    id: z.number(),
    title: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    title: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: "Update a document's title or re-point it to a new file URL.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.title === undefined && input.url === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either title or url must be provided.'
            });
        }

        if (input.title !== undefined && input.url === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: "Updating a document's title requires a url. Please provide the current or new url."
            });
        }

        // https://app.pipelinecrm.com/api/docs/introduction
        const response = await nango.put({
            endpoint: `/api/v3/documents/${encodeURIComponent(input.id)}`,
            data: {
                document: {
                    ...(input.title !== undefined && { title: input.title }),
                    ...(input.url !== undefined && { url: input.url })
                }
            },
            retries: 1
        });

        const providerDoc = ProviderDocumentSchema.parse(response.data);

        return {
            id: providerDoc.id,
            ...(providerDoc.title != null && { title: providerDoc.title }),
            ...(providerDoc.updated_at != null && { updated_at: providerDoc.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
