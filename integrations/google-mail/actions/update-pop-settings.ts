import { z } from 'zod';
import { createAction } from 'nango';

const AccessWindowSchema = z.enum(['accessWindowUnspecified', 'disabled', 'allMail', 'fromNowOn']);

const DispositionSchema = z.enum(['dispositionUnspecified', 'leaveInInbox', 'archive', 'trash', 'markRead']);

const PopSettingsSchema = z.object({
    accessWindow: AccessWindowSchema.optional().describe('The range of messages which are accessible via POP. Example: "allMail"'),
    disposition: DispositionSchema.optional().describe(
        'The action that will be executed on a message after it has been fetched via POP. Example: "leaveInInbox"'
    )
});

const InputSchema = PopSettingsSchema;

const OutputSchema = z.object({
    accessWindow: z.string().optional(),
    disposition: z.string().optional()
});

// Gmail returns an empty body (null) when POP settings are already at the
// requested state (e.g. disposition stays unspecified, access window stays
// disabled), so accept both a null response and a partial POP settings
// object. Fields are each optional because the API also returns subsets.
const ProviderResponseSchema = z
    .object({
        accessWindow: z.string().optional(),
        disposition: z.string().optional()
    })
    .nullish();

const action = createAction({
    description: 'Update POP access settings for the mailbox',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings/updatePop
        const response = await nango.put({
            endpoint: '/gmail/v1/users/me/settings/pop',
            data: {
                ...(input.accessWindow !== undefined && {
                    accessWindow: input.accessWindow
                }),
                ...(input.disposition !== undefined && {
                    disposition: input.disposition
                })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Gmail updatePop API'
            });
        }

        const validatedSettings = parsed.data ?? {};

        return {
            ...(validatedSettings.accessWindow !== undefined && {
                accessWindow: validatedSettings.accessWindow
            }),
            ...(validatedSettings.disposition !== undefined && {
                disposition: validatedSettings.disposition
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
