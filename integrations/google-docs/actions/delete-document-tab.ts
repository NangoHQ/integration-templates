import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('Google Docs document ID. Example: "1rG_Aj6JXSnTeaHzE0CoIOAYtPdrwRKbilw54N0WQU34"'),
    tabId: z.string().describe('Tab ID to delete. Example: "t.r7sklz35b6u5"')
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string().optional(),
    replies: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    documentId: z.string(),
    tabId: z.string()
});

const action = createAction({
    description: 'Delete a document tab by tab ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        deleteTab: {
                            tabId: input.tabId
                        }
                    }
                ]
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = BatchUpdateResponseSchema.parse(response.data);

        return {
            documentId: providerResponse.documentId || input.documentId,
            tabId: input.tabId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
