import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().optional().describe('User\'s email address. The special value "me" can be used to indicate the authenticated user.')
});

const ProviderLanguageSettingsSchema = z.object({
    displayLanguage: z.string().optional()
});

const OutputSchema = z.object({
    displayLanguage: z.string().optional()
});

const action = createAction({
    description: 'Retrieve Gmail language settings for the mailbox.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = input.userId || 'me';

        const response = await nango.get({
            // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings/getLanguage
            endpoint: `/gmail/v1/users/${encodeURIComponent(userId)}/settings/language`,
            retries: 3
        });

        const languageSettings = ProviderLanguageSettingsSchema.parse(response.data);

        return {
            ...(languageSettings.displayLanguage !== undefined && {
                displayLanguage: languageSettings.displayLanguage
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
