import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The display name of the label. Example: "Work"'),
    labelListVisibility: z
        .enum(['labelHide', 'labelShow', 'labelShowIfUnread'])
        .optional()
        .describe('The visibility of the label in the label list. Example: "labelShow"'),
    messageListVisibility: z.enum(['hide', 'show']).optional().describe('The visibility of the label in the message list. Example: "show"'),
    type: z.enum(['user']).optional().describe('The type of the label. Only "user" can be created. Defaults to "user".')
});

const ProviderLabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    labelListVisibility: z.string().optional(),
    messageListVisibility: z.string().optional(),
    type: z.string().optional(),
    messagesTotal: z.number().optional(),
    messagesUnread: z.number().optional(),
    threadsTotal: z.number().optional(),
    threadsUnread: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The immutable ID of the label.'),
    name: z.string().describe('The display name of the label.'),
    labelListVisibility: z.string().optional().describe('The visibility of the label in the label list.'),
    messageListVisibility: z.string().optional().describe('The visibility of the label in the message list.'),
    type: z.string().optional().describe('The type of the label.')
});

const action = createAction({
    description: 'Create a new user label with visibility settings.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.labels'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/create
        const response = await nango.post({
            endpoint: '/gmail/v1/users/me/labels',
            data: {
                name: input.name,
                ...(input.labelListVisibility !== undefined && {
                    labelListVisibility: input.labelListVisibility
                }),
                ...(input.messageListVisibility !== undefined && {
                    messageListVisibility: input.messageListVisibility
                }),
                ...(input.type !== undefined && { type: input.type })
            },
            retries: 3
        });

        const providerLabel = ProviderLabelSchema.parse(response.data);

        return {
            id: providerLabel.id,
            name: providerLabel.name,
            ...(providerLabel.labelListVisibility !== undefined && {
                labelListVisibility: providerLabel.labelListVisibility
            }),
            ...(providerLabel.messageListVisibility !== undefined && {
                messageListVisibility: providerLabel.messageListVisibility
            }),
            ...(providerLabel.type !== undefined && { type: providerLabel.type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
