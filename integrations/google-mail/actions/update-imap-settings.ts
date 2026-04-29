import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    imap_enabled: z.boolean().optional().describe('Whether IMAP is enabled for the account.'),
    auto_expunge: z.boolean().optional().describe('Whether to automatically expunge messages when they are deleted.'),
    expunge_behavior: z.enum(['archive', 'delete', 'trash']).optional().describe('Behavior for expunging messages.'),
    max_folder_size: z.number().int().min(0).max(10000000).optional().describe('Maximum folder size in MB. Range: 0 to 10000000.')
});

const ProviderImapSettingsSchema = z.object({
    enabled: z.boolean().optional(),
    imapEnabled: z.boolean().optional(),
    autoExpunge: z.boolean().optional(),
    expungeBehavior: z.string().optional(),
    maxFolderSize: z.number().int().optional()
});

const OutputSchema = z.object({
    imap_enabled: z.boolean().optional(),
    auto_expunge: z.boolean().optional(),
    expunge_behavior: z.enum(['archive', 'delete', 'trash']).optional(),
    max_folder_size: z.number().int().optional()
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
            requestBody['imapEnabled'] = input.imap_enabled;
        }
        if (input.auto_expunge !== undefined) {
            requestBody['autoExpunge'] = input.auto_expunge;
        }
        if (input.expunge_behavior !== undefined) {
            requestBody['expungeBehavior'] = input.expunge_behavior.toUpperCase();
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

        const imapEnabledValue = providerSettings['imapEnabled'] ?? providerSettings['enabled'];
        if (imapEnabledValue !== undefined) {
            output.imap_enabled = imapEnabledValue;
        }
        if (providerSettings['autoExpunge'] !== undefined) {
            output.auto_expunge = providerSettings['autoExpunge'];
        }
        if (providerSettings['expungeBehavior'] !== undefined) {
            const behavior = providerSettings['expungeBehavior'].toLowerCase();
            if (behavior === 'archive' || behavior === 'delete' || behavior === 'trash') {
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
