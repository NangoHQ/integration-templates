import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('The ID of the document to delete the footer from. Example: "1ctrF7XM2lZqmQeOBjGXi0SrUY6jgyKwYhDMq5S6omZQ"'),
    footerId: z.string().describe('The ID of the footer to delete. Example: "kix.910kf3z0ydqh"'),
    tabId: z.string().optional().describe('The tab that contains the footer to delete. When omitted, applies to the first tab.')
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string().optional(),
    replies: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    documentId: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a footer by footer ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-footer',
        group: 'Documents'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        deleteFooter: {
                            footerId: input.footerId,
                            ...(input.tabId !== undefined && { tabId: input.tabId })
                        }
                    }
                ]
            },
            retries: 3
        });

        const parsed = BatchUpdateResponseSchema.parse(response.data);

        return {
            documentId: parsed.documentId || input.documentId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
