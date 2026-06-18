import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    q: z
        .string()
        .optional()
        .describe(
            'Only return messages matching the specified query. Supports the same query format as the Gmail search box. For example: "from:someuser@example.com rfc822msgid: is:unread"'
        ),
    labelIds: z.array(z.string()).optional().describe('Only return messages with labels that match all of the specified label IDs.'),
    includeSpamTrash: z.boolean().optional().describe('Include messages from SPAM and TRASH in the results.'),
    maxResults: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Maximum number of messages to return. Defaults to 100. The maximum allowed value is 500.'),
    pageToken: z.string().optional().describe('Page token to retrieve a specific page of results in the list.')
});

const MessageSchema = z.object({
    id: z.string(),
    threadId: z.string()
});

const OutputSchema = z.object({
    messages: z.array(MessageSchema),
    nextPageToken: z.string().optional(),
    resultSizeEstimate: z.number().int().optional()
});

const action = createAction({
    description: 'List messages matching Gmail query and label filters.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list
        const response = await nango.get({
            endpoint: '/gmail/v1/users/me/messages',
            params: {
                ...(input.q !== undefined && { q: input.q }),
                ...(input.labelIds !== undefined && input.labelIds.length > 0 && { labelIds: input.labelIds }),
                ...(input.includeSpamTrash !== undefined && { includeSpamTrash: String(input.includeSpamTrash) }),
                ...(input.maxResults !== undefined && { maxResults: String(input.maxResults) }),
                ...(input.pageToken !== undefined && { pageToken: input.pageToken })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                messages: z
                    .array(
                        z.object({
                            id: z.string(),
                            threadId: z.string()
                        })
                    )
                    .optional(),
                nextPageToken: z.string().optional(),
                resultSizeEstimate: z.number().int().optional()
            })
            .parse(response.data);

        return {
            messages: providerResponse.messages ?? [],
            ...(providerResponse.nextPageToken !== undefined && { nextPageToken: providerResponse.nextPageToken }),
            ...(providerResponse.resultSizeEstimate !== undefined && { resultSizeEstimate: providerResponse.resultSizeEstimate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
