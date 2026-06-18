import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Label ID. Example: "Label_123"'),
    userId: z.string().optional().describe('User ID. The special value "me" can be used to indicate the authenticated user. Default: "me".')
});

const ProviderColorSchema = z.object({
    textColor: z.string().optional(),
    backgroundColor: z.string().optional()
});

const ProviderLabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    messageListVisibility: z.enum(['show', 'hide']).optional(),
    labelListVisibility: z.enum(['labelShow', 'labelShowIfUnread', 'labelHide']).optional(),
    type: z.enum(['system', 'user']).optional(),
    messagesTotal: z.number().optional(),
    messagesUnread: z.number().optional(),
    threadsTotal: z.number().optional(),
    threadsUnread: z.number().optional(),
    color: ProviderColorSchema.optional()
});

const ColorOutputSchema = z.object({
    textColor: z.string().optional(),
    backgroundColor: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    messageListVisibility: z.enum(['show', 'hide']).optional(),
    labelListVisibility: z.enum(['labelShow', 'labelShowIfUnread', 'labelHide']).optional(),
    type: z.enum(['system', 'user']).optional(),
    messagesTotal: z.number().optional(),
    messagesUnread: z.number().optional(),
    threadsTotal: z.number().optional(),
    threadsUnread: z.number().optional(),
    color: ColorOutputSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single Gmail label by label ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.labels'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = input.userId ?? 'me';

        const response = await nango.get({
            // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/get
            endpoint: `/gmail/v1/users/${encodeURIComponent(userId)}/labels/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Label not found',
                labelId: input.id
            });
        }

        const label = ProviderLabelSchema.parse(response.data);

        return {
            id: label.id,
            name: label.name,
            ...(label.messageListVisibility !== undefined && {
                messageListVisibility: label.messageListVisibility
            }),
            ...(label.labelListVisibility !== undefined && {
                labelListVisibility: label.labelListVisibility
            }),
            ...(label.type !== undefined && { type: label.type }),
            ...(label.messagesTotal !== undefined && { messagesTotal: label.messagesTotal }),
            ...(label.messagesUnread !== undefined && { messagesUnread: label.messagesUnread }),
            ...(label.threadsTotal !== undefined && { threadsTotal: label.threadsTotal }),
            ...(label.threadsUnread !== undefined && { threadsUnread: label.threadsUnread }),
            ...(label.color !== undefined && {
                color: {
                    ...(label.color.textColor !== undefined && { textColor: label.color.textColor }),
                    ...(label.color.backgroundColor !== undefined && { backgroundColor: label.color.backgroundColor })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
