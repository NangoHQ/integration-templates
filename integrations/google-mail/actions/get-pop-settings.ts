import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().optional().describe("User's email address. The special value 'me' can be used to indicate the authenticated user. Defaults to 'me'.")
});

const ProviderPopSettingsSchema = z.object({
    accessWindow: z
        .enum(['accessWindowUnspecified', 'disabled', 'fromNowOn', 'allMail'])
        .optional()
        .describe('The range of messages which are accessible via POP.'),
    disposition: z
        .enum(['dispositionUnspecified', 'leaveInInbox', 'archive', 'trash', 'markRead'])
        .optional()
        .describe('The action that will be executed on a message after it has been fetched via POP.')
});

const OutputSchema = z.object({
    accessWindow: z
        .enum(['accessWindowUnspecified', 'disabled', 'fromNowOn', 'allMail'])
        .optional()
        .describe('The range of messages which are accessible via POP.'),
    disposition: z
        .enum(['dispositionUnspecified', 'leaveInInbox', 'archive', 'trash', 'markRead'])
        .optional()
        .describe('The action that will be executed on a message after it has been fetched via POP.')
});

const action = createAction({
    description: 'Retrieve POP settings for the mailbox.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = input.userId || 'me';

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings/getPop
        const response = await nango.get({
            endpoint: `/gmail/v1/users/${encodeURIComponent(userId)}/settings/pop`,
            retries: 3
        });

        const settings = ProviderPopSettingsSchema.parse(response.data);

        return {
            ...(settings.accessWindow !== undefined && {
                accessWindow: settings.accessWindow
            }),
            ...(settings.disposition !== undefined && {
                disposition: settings.disposition
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
