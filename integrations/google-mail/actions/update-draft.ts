import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the draft to update. Example: "r-1234567890"'),
    raw: z.string().describe('The raw RFC 2822 formatted MIME message as a base64url encoded string.')
});

const ProviderMessageSchema = z.object({
    id: z.string(),
    threadId: z.string().optional(),
    labelIds: z.array(z.string()).optional(),
    snippet: z.string().optional(),
    historyId: z.string().optional(),
    internalDate: z.string().optional(),
    payload: z.object({}).passthrough().optional(),
    sizeEstimate: z.number().optional(),
    raw: z.string().optional()
});

const ProviderDraftSchema = z.object({
    id: z.string(),
    message: ProviderMessageSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    message: z
        .object({
            id: z.string(),
            threadId: z.string().optional(),
            labelIds: z.array(z.string()).optional(),
            snippet: z.string().optional(),
            historyId: z.string().optional(),
            internalDate: z.string().optional(),
            sizeEstimate: z.number().optional(),
            raw: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Replace an existing draft with new MIME content.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.compose'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/update
        const response = await nango.put({
            endpoint: `/gmail/v1/users/me/drafts/${encodeURIComponent(input.id)}`,
            data: {
                message: {
                    raw: input.raw
                }
            },
            retries: 10
        });

        const providerDraft = ProviderDraftSchema.parse(response.data);

        return {
            id: providerDraft.id,
            ...(providerDraft.message && {
                message: {
                    id: providerDraft.message.id,
                    threadId: providerDraft.message.threadId,
                    labelIds: providerDraft.message.labelIds,
                    snippet: providerDraft.message.snippet,
                    historyId: providerDraft.message.historyId,
                    internalDate: providerDraft.message.internalDate,
                    sizeEstimate: providerDraft.message.sizeEstimate,
                    raw: providerDraft.message.raw
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
