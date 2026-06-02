import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('Google Docs document ID. Example: "1DLhzKGEHJyyDul07fu34aPrhaA5HOijCord1pNz79dQ"'),
    text: z.string().optional().describe('Optional text to insert into the newly created header.')
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string(),
    replies: z.array(
        z.object({
            createHeader: z
                .object({
                    headerId: z.string()
                })
                .optional()
        })
    )
});

const OutputSchema = z.object({
    documentId: z.string(),
    headerId: z.string(),
    textInserted: z.boolean()
});

const action = createAction({
    description: 'Create a header in a document section.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-header',
        group: 'Documents'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
        const createResponse = await nango.post({
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        createHeader: {
                            type: 'DEFAULT'
                        }
                    }
                ]
            },
            retries: 3
        });

        const batchResult = BatchUpdateResponseSchema.parse(createResponse.data);
        const reply = batchResult.replies[0];
        if (!reply?.createHeader?.headerId) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Failed to create header: missing headerId in response.'
            });
        }

        const headerId = reply.createHeader.headerId;
        let textInserted = false;

        if (input.text) {
            // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
            await nango.post({
                endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
                data: {
                    requests: [
                        {
                            insertText: {
                                endOfSegmentLocation: {
                                    segmentId: headerId
                                },
                                text: input.text
                            }
                        }
                    ]
                },
                retries: 3
            });
            textInserted = true;
        }

        return {
            documentId: input.documentId,
            headerId,
            textInserted
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
