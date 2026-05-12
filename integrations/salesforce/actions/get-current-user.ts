import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderUserInfoSchema = z.object({
    sub: z.string().optional(),
    user_id: z.string(),
    organization_id: z.string(),
    username: z.string().optional(),
    email: z.string().optional(),
    email_verified: z.boolean().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    name: z.string().optional(),
    picture: z.string().optional(),
    zoneinfo: z.string().optional(),
    locale: z.string().optional(),
    profile: z.string().optional()
});

const OutputSchema = z.object({
    user_id: z.string().describe('Salesforce user ID. Example: "005x00000012Q9P"'),
    organization_id: z.string().describe('Salesforce organization ID. Example: "00Dx0000000BV7z"'),
    username: z.string().optional().describe('Salesforce username. Example: "admin@company.com"'),
    email: z.string().optional().describe('Email address of the user.'),
    email_verified: z.boolean().optional().describe('Whether the email has been verified.'),
    first_name: z.string().optional().describe('First name of the user.'),
    last_name: z.string().optional().describe('Last name of the user.'),
    display_name: z.string().optional().describe('Display name of the user.'),
    picture: z.string().optional().describe('URL to the user profile picture.'),
    timezone: z.string().optional().describe('User time zone.'),
    locale: z.string().optional().describe('User locale.'),
    profile_url: z.string().optional().describe('URL to the user profile.')
});

const action = createAction({
    description: 'Retrieve the current Salesforce user and org identity context.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-current-user',
        group: 'Identity'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://help.salesforce.com/s/articleView?id=xcloud.remoteaccess_using_userinfo_endpoint.htm
        const response = await nango.get({
            endpoint: '/services/oauth2/userinfo',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User info not available'
            });
        }

        const userInfo = ProviderUserInfoSchema.parse(response.data);

        return {
            user_id: userInfo.user_id,
            organization_id: userInfo.organization_id,
            ...(userInfo.username !== undefined && { username: userInfo.username }),
            ...(userInfo.email !== undefined && { email: userInfo.email }),
            ...(userInfo.email_verified !== undefined && { email_verified: userInfo.email_verified }),
            ...(userInfo.given_name !== undefined && { first_name: userInfo.given_name }),
            ...(userInfo.family_name !== undefined && { last_name: userInfo.family_name }),
            ...(userInfo.name !== undefined && { display_name: userInfo.name }),
            ...(userInfo.picture !== undefined && { picture: userInfo.picture }),
            ...(userInfo.zoneinfo !== undefined && { timezone: userInfo.zoneinfo }),
            ...(userInfo.locale !== undefined && { locale: userInfo.locale }),
            ...(userInfo.profile !== undefined && { profile_url: userInfo.profile })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
