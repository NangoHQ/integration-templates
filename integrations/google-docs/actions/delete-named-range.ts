import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('The ID of the document containing the named range. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    namedRangeId: z
        .string()
        .optional()
        .describe('The ID of the named range to delete. Either namedRangeId or name must be provided. Example: "kix.ppfiu2m5lqas"'),
    name: z.string().optional().describe('The name of the named range to delete. Either namedRangeId or name must be provided. Example: "nango-test-range"'),
    tabId: z.string().optional().describe('The tab ID to scope the deletion to. Example: "t.0"')
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string(),
    replies: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    documentId: z.string()
});

const action = createAction({
    description: 'Delete a named range by ID or by name.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.namedRangeId && !input.name) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either namedRangeId or name must be provided.'
            });
        }

        const deleteNamedRangeRequest: Record<string, unknown> = {};
        if (input.namedRangeId !== undefined) {
            deleteNamedRangeRequest['namedRangeId'] = input.namedRangeId;
        }
        if (input.name !== undefined) {
            deleteNamedRangeRequest['name'] = input.name;
        }
        if (input.tabId !== undefined) {
            deleteNamedRangeRequest['tabsCriteria'] = { tabIds: [input.tabId] };
        }

        // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
        const response = await nango.post({
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        deleteNamedRange: deleteNamedRangeRequest
                    }
                ]
            },
            retries: 3
        });

        const batchResponse = BatchUpdateResponseSchema.parse(response.data);

        return {
            success: true,
            documentId: batchResponse.documentId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
