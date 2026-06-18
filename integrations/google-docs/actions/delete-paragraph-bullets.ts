import { z } from 'zod';
import { createAction } from 'nango';

const RangeSchema = z.object({
    startIndex: z.number().describe('The start index of the range (inclusive). Example: 153'),
    endIndex: z.number().describe('The end index of the range (exclusive). Example: 199'),
    segmentId: z.string().optional().describe('The segment ID. Omit or use empty string for the body segment. Example: ""')
});

const InputSchema = z.object({
    documentId: z.string().describe('The ID of the document to update. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    range: RangeSchema.describe('The range of paragraphs to remove bullets from.')
});

const OutputSchema = z.object({
    documentId: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Remove bullets or numbering from paragraphs in a range.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const documentId = input.documentId;
        const range = input.range;

        // https://developers.google.com/docs/api/reference/rest/v1/documents/request#deleteparagraphbullets
        await nango.post({
            endpoint: `/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        deleteParagraphBullets: {
                            range: {
                                startIndex: range.startIndex,
                                endIndex: range.endIndex,
                                ...(range.segmentId !== undefined && { segmentId: range.segmentId })
                            }
                        }
                    }
                ]
            },
            retries: 3
        });

        return {
            documentId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
