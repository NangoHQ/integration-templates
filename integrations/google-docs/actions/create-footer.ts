import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('Google Docs document ID. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    text: z.string().optional().describe('Optional text to insert into the newly created footer.'),
    sectionBreakIndex: z.number().optional().describe('Index of the section break in the document body. Defaults to 0 for the first section.')
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string(),
    replies: z.array(
        z.object({
            createFooter: z
                .object({
                    footerId: z.string()
                })
                .optional()
        })
    )
});

const OutputSchema = z.object({
    documentId: z.string(),
    footerId: z.string(),
    textInserted: z.boolean().optional()
});

const action = createAction({
    description: 'Create a footer in a document section',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-footer',
        group: 'Document'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const documentId = input.documentId;
        const sectionBreakIndex = input.sectionBreakIndex ?? 0;

        // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
        const createResponse = await nango.post({
            endpoint: `/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        createFooter: {
                            sectionBreakLocation: {
                                index: sectionBreakIndex,
                                segmentId: ''
                            },
                            type: 'DEFAULT'
                        }
                    }
                ]
            },
            retries: 3
        });

        const createResult = BatchUpdateResponseSchema.parse(createResponse.data);
        const reply = createResult.replies[0];
        const footerId = reply?.createFooter?.footerId;

        if (!footerId) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Failed to create footer: no footerId returned'
            });
        }

        let textInserted = false;

        if (input.text && input.text.length > 0) {
            // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
            await nango.post({
                endpoint: `/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
                data: {
                    requests: [
                        {
                            insertText: {
                                text: input.text,
                                endOfSegmentLocation: {
                                    segmentId: footerId
                                }
                            }
                        }
                    ]
                },
                retries: 3
            });
            textInserted = true;
        }

        return {
            documentId: createResult.documentId,
            footerId,
            ...(textInserted && { textInserted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
