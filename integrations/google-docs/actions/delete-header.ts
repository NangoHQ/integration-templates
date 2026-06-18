import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('Google Docs document ID. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    headerId: z.string().describe('Header ID to delete. Example: "kix.oq93zh93nzrf"')
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string().optional(),
    replies: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    documentId: z.string(),
    headerId: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a header by header ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
            endpoint: `v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        deleteHeader: {
                            headerId: input.headerId
                        }
                    }
                ]
            },
            retries: 3
        };

        const response = await nango.post(config);
        const parsedResponse = BatchUpdateResponseSchema.parse(response.data);

        return {
            documentId: parsedResponse.documentId || input.documentId,
            headerId: input.headerId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
