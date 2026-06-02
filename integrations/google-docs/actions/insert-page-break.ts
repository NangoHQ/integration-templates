import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('Google Docs document ID. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    index: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Zero-based body index where the page break should be inserted. If omitted, the page break is inserted at the end of the document body.')
});

const OutputSchema = z.object({
    documentId: z.string(),
    inserted: z.boolean()
});

const action = createAction({
    description: 'Insert a page break in the document body.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/insert-page-break',
        group: 'Documents'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            requests: Array<{
                insertPageBreak: {
                    location?: {
                        index: number;
                        segmentId: string;
                    };
                    endOfSegmentLocation?: {
                        segmentId: string;
                    };
                };
            }>;
        } = {
            requests: []
        };

        if (input.index !== undefined) {
            requestBody.requests.push({
                insertPageBreak: {
                    location: {
                        index: input.index,
                        segmentId: ''
                    }
                }
            });
        } else {
            requestBody.requests.push({
                insertPageBreak: {
                    endOfSegmentLocation: {
                        segmentId: ''
                    }
                }
            });
        }

        // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
        await nango.post({
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: requestBody,
            retries: 3
        });

        return {
            documentId: input.documentId,
            inserted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
