import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().optional().describe('User ID. Example: "me"')
});

const ProviderImapSettingsSchema = z.object({
    autoExpunge: z.boolean().optional(),
    enabled: z.boolean().optional(),
    expungeBehavior: z.enum(['expungeBehaviorUnspecified', 'archive', 'trash', 'deleteForever']).optional(),
    maxFolderSize: z.union([z.literal(0), z.literal(1000), z.literal(2000), z.literal(5000), z.literal(10000)]).optional()
});

const OutputSchema = z.object({
    autoExpunge: z.boolean().optional(),
    enabled: z.boolean().optional(),
    expungeBehavior: z.enum(['expungeBehaviorUnspecified', 'archive', 'trash', 'deleteForever']).optional(),
    maxFolderSize: z.union([z.literal(0), z.literal(1000), z.literal(2000), z.literal(5000), z.literal(10000)]).optional()
});

const action = createAction({
    description: 'Retrieve IMAP settings for the mailbox',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [
        'https://www.googleapis.com/auth/gmail.settings.basic',
        'https://mail.google.com/',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.readonly'
    ],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = input.userId ?? 'me';

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings/getImap
        const response = await nango.get({
            endpoint: `/gmail/v1/users/${encodeURIComponent(userId)}/settings/imap`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'IMAP settings not found'
            });
        }

        const providerSettings = ProviderImapSettingsSchema.parse(response.data);

        return {
            ...(providerSettings.autoExpunge !== undefined && { autoExpunge: providerSettings.autoExpunge }),
            ...(providerSettings.enabled !== undefined && { enabled: providerSettings.enabled }),
            ...(providerSettings.expungeBehavior !== undefined && { expungeBehavior: providerSettings.expungeBehavior }),
            ...(providerSettings.maxFolderSize !== undefined && { maxFolderSize: providerSettings.maxFolderSize })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
