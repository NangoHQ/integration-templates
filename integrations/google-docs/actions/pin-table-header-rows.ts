import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('The ID of the document containing the table. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    tableStartLocation: z.number().int().min(0).describe('The index of the table element in the document body. Example: 211'),
    pinnedHeaderRowsCount: z.number().int().min(0).describe('The number of rows to pin as header rows. Use 0 to unpin. Example: 1')
});

const PinTableHeaderRowsReplySchema = z.object({}).passthrough();

const BatchUpdateResponseSchema = z
    .object({
        replies: z.array(PinTableHeaderRowsReplySchema).optional(),
        documentId: z.string().optional(),
        revisionId: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    documentId: z.string(),
    revisionId: z.string().optional(),
    replies: z.array(PinTableHeaderRowsReplySchema).optional()
});

const action = createAction({
    description: 'Pin or unpin a number of rows as frozen headers in a table.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/pin-table-header-rows',
        group: 'Documents'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents', 'drive', 'drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        pinTableHeaderRows: {
                            tableStartLocation: {
                                index: input.tableStartLocation
                            },
                            pinnedHeaderRowsCount: input.pinnedHeaderRowsCount
                        }
                    }
                ]
            },
            retries: 3
        });

        const parsed = BatchUpdateResponseSchema.parse(response.data);

        if (!parsed.documentId) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider response did not include a documentId.'
            });
        }

        return {
            documentId: parsed.documentId,
            ...(parsed.revisionId !== undefined && { revisionId: parsed.revisionId }),
            ...(parsed.replies !== undefined && { replies: parsed.replies })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
