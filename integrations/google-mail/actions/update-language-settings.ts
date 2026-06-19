import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    displayLanguage: z.string().describe('The language to display the Gmail UI in. Example: "en", "fr", "es", "de". Use "en" for English.')
});

const ProviderLanguageSettingsSchema = z.object({
    displayLanguage: z.string()
});

const OutputSchema = z.object({
    displayLanguage: z.string()
});

const action = createAction({
    description: 'Update the mailbox display language',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings/updateLanguage
        const response = await nango.put({
            endpoint: '/gmail/v1/users/me/settings/language',
            data: {
                displayLanguage: input.displayLanguage
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update language settings'
            });
        }

        const languageSettings = ProviderLanguageSettingsSchema.parse(response.data);

        return {
            displayLanguage: languageSettings.displayLanguage
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
