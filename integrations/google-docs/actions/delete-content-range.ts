import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('Google Docs document ID. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    startIndex: z.number().int().nonnegative().describe('Inclusive start index of the range to delete.'),
    endIndex: z.number().int().nonnegative().describe('Exclusive end index of the range to delete.'),
    segmentId: z.string().optional().describe('Segment ID to delete from. Use the headerId or footerId for headers/footers; omit or use "" for the body.')
});

const BatchUpdateReplySchema = z.record(z.string(), z.unknown());

const ProviderResponseSchema = z.object({
    documentId: z.string(),
    replies: z.array(BatchUpdateReplySchema).optional(),
    writeControl: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    documentId: z.string(),
    replies: z.array(z.record(z.string(), z.unknown())),
    writeControl: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description:
        'Delete text or other removable content from a range in a Google Doc. The range must be structurally valid: it cannot span table cells, section breaks, or the final newline of a segment (body, header, or footer).',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents', 'drive', 'drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.endIndex <= input.startIndex) {
            throw new nango.ActionError({
                type: 'invalid_range',
                message: 'endIndex must be greater than startIndex.'
            });
        }

        const response = await nango.post({
            // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        deleteContentRange: {
                            range: {
                                segmentId: input.segmentId ?? '',
                                startIndex: input.startIndex,
                                endIndex: input.endIndex
                            }
                        }
                    }
                ]
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            documentId: parsed.documentId,
            replies: parsed.replies ?? [],
            ...(parsed.writeControl !== undefined && { writeControl: parsed.writeControl })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
