import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    // No input required for this endpoint
});

const FullAccountSchema = z.object({
    account_id: z.string(),
    name: z.object({
        given_name: z.string(),
        surname: z.string(),
        familiar_name: z.string(),
        display_name: z.string()
    }),
    email: z.string(),
    email_verified: z.boolean().optional(),
    disabled: z.boolean().optional(),
    locale: z.string().optional(),
    referral_link: z.string().optional(),
    is_paired: z.boolean().optional(),
    account_type: z.object({
        '.tag': z.string()
    }),
    root_info: z
        .object({
            '.tag': z.string(),
            root_namespace_id: z.string().optional(),
            home_namespace_id: z.string().optional()
        })
        .optional(),
    profile_photo_url: z.string().optional(),
    country: z.string().optional(),
    team: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional(),
    team_member_id: z.string().optional()
});

const OutputSchema = z.object({
    account_id: z.string(),
    name: z.object({
        given_name: z.string(),
        surname: z.string(),
        familiar_name: z.string(),
        display_name: z.string()
    }),
    email: z.string(),
    account_type: z.string(),
    email_verified: z.boolean().optional(),
    disabled: z.boolean().optional(),
    locale: z.string().optional(),
    referral_link: z.string().optional(),
    is_paired: z.boolean().optional(),
    profile_photo_url: z.string().optional(),
    country: z.string().optional(),
    team: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional(),
    team_member_id: z.string().optional()
});

const action = createAction({
    description: 'Retrieve the authenticated Dropbox account profile.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account_info.read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#users-get_current_account
        // The Dropbox API expects a JSON body with null value for this endpoint
        // Using 'text/plain; charset=dropbox-cors-hack' which Dropbox accepts as an alternative to application/json
        // This content type prevents axios from JSON-serializing the data
        const response = await nango.post({
            endpoint: '/2/users/get_current_account',
            data: 'null',
            headers: {
                'Content-Type': 'text/plain; charset=dropbox-cors-hack'
            },
            retries: 3
        });

        const account = FullAccountSchema.parse(response.data);

        return {
            account_id: account.account_id,
            name: account.name,
            email: account.email,
            account_type: account.account_type['.tag'],
            ...(account.email_verified !== undefined && {
                email_verified: account.email_verified
            }),
            ...(account.disabled !== undefined && { disabled: account.disabled }),
            ...(account.locale !== undefined && { locale: account.locale }),
            ...(account.referral_link !== undefined && {
                referral_link: account.referral_link
            }),
            ...(account.is_paired !== undefined && {
                is_paired: account.is_paired
            }),
            ...(account.profile_photo_url !== undefined && {
                profile_photo_url: account.profile_photo_url
            }),
            ...(account.country !== undefined && { country: account.country }),
            ...(account.team !== undefined && { team: account.team }),
            ...(account.team_member_id !== undefined && {
                team_member_id: account.team_member_id
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
