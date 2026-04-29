import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    imap_enabled: z.boolean().optional().describe('Whether IMAP is enabled for the account.'),
    auto_expunge: z.boolean().optional().describe('Whether to automatically expunge messages when they are deleted.'),
    expunge_behavior: z.enum(['archive', 'trash', 'deleteForever']).optional().describe('Behavior for expunging messages.'),
    max_folder_size: z
        .union([z.literal(0), z.literal(1000), z.literal(2000), z.literal(5000), z.literal(10000)])
        .optional()
        .describe('Maximum folder size. Allowed values: 0 (unlimited), 1000, 2000, 5000, 10000.')
});

const ProviderImapSettingsSchema = z.object({
    enabled: z.boolean().optional(),
    autoExpunge: z.boolean().optional(),
    expungeBehavior: z.enum(['expungeBehaviorUnspecified', 'archive', 'trash', 'deleteForever']).optional(),
    maxFolderSize: z.union([z.literal(0), z.literal(1000), z.literal(2000), z.literal(5000), z.literal(10000)]).optional()
});

const OutputSchema = z.object({
    imap_enabled: z.boolean().optional(),
    auto_expunge: z.boolean().optional(),
    expunge_behavior: z.enum(['archive', 'trash', 'deleteForever']).optional(),
    max_folder_size: z.union([z.literal(0), z.literal(1000), z.literal(2000), z.literal(5000), z.literal(10000)]).optional()
});

type Output = z.infer<typeof OutputSchema>;

const action = createAction({
    description: 'Update IMAP enablement and visibility settings.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-imap-settings',
        group: 'Settings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.basic'],

    exec: async (nango, input): Promise<Output> => {
        const requestBody: Record<string, unknown> = {};

        if (input.imap_enabled !== undefined) {
            requestBody['enabled'] = input.imap_enabled;
        }
        if (input.auto_expunge !== undefined) {
            requestBody['autoExpunge'] = input.auto_expunge;
        }
        if (input.expunge_behavior !== undefined) {
            requestBody['expungeBehavior'] = input.expunge_behavior;
        }
        if (input.max_folder_size !== undefined) {
            requestBody['maxFolderSize'] = input.max_folder_size;
        }

        const response = await nango.put({
            // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings/updateImap
            endpoint: '/gmail/v1/users/me/settings/imap',
            data: requestBody,
            retries: 3
        });

        const providerSettings = ProviderImapSettingsSchema.parse(response.data);

        const output: Output = {};

        if (providerSettings['enabled'] !== undefined) {
            output.imap_enabled = providerSettings['enabled'];
        }
        if (providerSettings['autoExpunge'] !== undefined) {
            output.auto_expunge = providerSettings['autoExpunge'];
        }
        if (providerSettings['expungeBehavior'] !== undefined) {
            const behavior = providerSettings['expungeBehavior'];
            if (behavior === 'archive' || behavior === 'trash' || behavior === 'deleteForever') {
                output.expunge_behavior = behavior;
            }
        }
        if (providerSettings['maxFolderSize'] !== undefined) {
            output.max_folder_size = providerSettings['maxFolderSize'];
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
