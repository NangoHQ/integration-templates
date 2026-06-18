import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('Google Docs document ID. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    name: z.string().describe('Name for the new named range. Example: "my-range"'),
    startIndex: z.number().int().describe('Start index of the range (inclusive).'),
    endIndex: z.number().int().describe('End index of the range (exclusive).')
});

const OutputSchema = z.object({
    namedRangeId: z.string().describe('The ID of the newly created named range.')
});

const BatchUpdateResponseSchema = z.object({
    replies: z.array(
        z.object({
            createNamedRange: z
                .object({
                    namedRangeId: z.string()
                })
                .optional()
        })
    )
});

const action = createAction({
    description: 'Create a named range over a text range.',
    version: '1.0.1',
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
                        createNamedRange: {
                            name: input.name,
                            range: {
                                segmentId: '',
                                startIndex: input.startIndex,
                                endIndex: input.endIndex
                            }
                        }
                    }
                ]
            },
            retries: 3
        });

        const batchResponse = BatchUpdateResponseSchema.parse(response.data);

        const firstReply = batchResponse.replies[0];
        if (!firstReply || !firstReply.createNamedRange) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Failed to create named range: unexpected response structure'
            });
        }

        return {
            namedRangeId: firstReply.createNamedRange.namedRangeId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
