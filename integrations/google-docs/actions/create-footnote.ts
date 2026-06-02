import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('The ID of the document to add the footnote to. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    index: z.number().int().describe('The zero-based body index where the footnote reference should be inserted. Example: 10'),
    tabId: z.string().optional().describe('The tab ID for multi-tab documents. Omit for the first tab.'),
    footnoteText: z.string().optional().describe('Optional text to insert into the newly created footnote segment.')
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string(),
    replies: z.array(
        z.object({
            createFootnote: z
                .object({
                    footnoteId: z.string()
                })
                .optional()
        })
    )
});

const OutputSchema = z.object({
    documentId: z.string(),
    footnoteId: z.string(),
    footnoteText: z.string().optional()
});

const action = createAction({
    description: 'Insert a footnote at a body location.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-footnote'
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
                        createFootnote: {
                            location: {
                                segmentId: '',
                                index: input.index,
                                ...(input.tabId !== undefined && { tabId: input.tabId })
                            }
                        }
                    }
                ]
            },
            retries: 3
        });

        const createResult = BatchUpdateResponseSchema.parse(createResponse.data);
        const footnoteId = createResult.replies[0]?.createFootnote?.footnoteId;

        if (!footnoteId) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Failed to create footnote: no footnoteId returned'
            });
        }

        if (input.footnoteText !== undefined && input.footnoteText !== '') {
            // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
            await nango.post({
                endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
                data: {
                    requests: [
                        {
                            insertText: {
                                endOfSegmentLocation: {
                                    segmentId: footnoteId
                                },
                                text: input.footnoteText
                            }
                        }
                    ]
                },
                retries: 3
            });
        }

        return {
            documentId: input.documentId,
            footnoteId,
            ...(input.footnoteText !== undefined && { footnoteText: input.footnoteText })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
