import { z } from 'zod';
import { createAction } from 'nango';

// No input needed for this action
const InputSchema = z.object({});

// Provider schema based on Jira Cloud REST API v3 /myself endpoint
// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-myself/#api-rest-api-3-myself-get
const ProviderUserSchema = z.object({
    accountId: z.string(),
    accountType: z.string().optional(),
    displayName: z.string(),
    emailAddress: z.string().optional().nullable(),
    avatarUrls: z
        .object({
            '16x16': z.string().optional(),
            '24x24': z.string().optional(),
            '32x32': z.string().optional(),
            '48x48': z.string().optional()
        })
        .optional(),
    timeZone: z.string().optional(),
    locale: z.string().optional().nullable(),
    active: z.boolean().optional()
});

const OutputSchema = z.object({
    account_id: z.string().describe('The account ID of the user. Example: "5b10ac8d82e05b22cc7d4ef5"'),
    account_type: z.string().optional().describe('The type of account. Example: "atlassian"'),
    display_name: z.string().describe('The display name of the user. Example: "John Doe"'),
    email_address: z.string().optional().describe('The email address of the user. Example: "john.doe@example.com"'),
    avatar_urls: z
        .object({
            '16x16': z.string().optional(),
            '24x24': z.string().optional(),
            '32x32': z.string().optional(),
            '48x48': z.string().optional()
        })
        .optional(),
    time_zone: z.string().optional().describe('The time zone of the user. Example: "Europe/Berlin"'),
    locale: z.string().optional().describe('The locale of the user. Example: "en_US"'),
    active: z.boolean().optional().describe('Whether the user is active. Example: true')
});

const action = createAction({
    description: 'Retrieve the currently authenticated Jira user.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // Get cloudId from connection config
        const connection = await nango.getConnection();

        const cloudId = connection.connection_config?.['cloudId'];
        if (!cloudId || typeof cloudId !== 'string') {
            throw new nango.ActionError({
                type: 'invalid_config',
                message: 'Missing cloudId in connection configuration'
            });
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-myself/#api-rest-api-3-myself-get
        const response = await nango.get({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/myself`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Could not retrieve current user'
            });
        }

        const user = ProviderUserSchema.parse(response.data);

        return {
            account_id: user.accountId,
            ...(user.accountType !== undefined && { account_type: user.accountType }),
            display_name: user.displayName,
            ...(user.emailAddress != null && { email_address: user.emailAddress }),
            ...(user.avatarUrls !== undefined && { avatar_urls: user.avatarUrls }),
            ...(user.timeZone !== undefined && { time_zone: user.timeZone }),
            ...(user.locale != null && { locale: user.locale }),
            ...(user.active !== undefined && { active: user.active })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
