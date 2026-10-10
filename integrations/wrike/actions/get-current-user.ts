import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input is required; the action always resolves the account tied to the current connection.');

const ProfileSchema = z.object({
    accountId: z.string().describe('Wrike account ID this profile belongs to. Example: "IEAG5DAK"'),
    email: z.string().describe('Email address associated with this account profile.'),
    role: z.string().describe('Role within the account. One of "User" or "Collaborator".'),
    admin: z.boolean().describe('Whether the user is an account administrator.'),
    owner: z.boolean().describe('Whether the user is the account owner.'),
    active: z.boolean().describe('Whether the user is active in this account.'),
    external: z.boolean().optional().describe('Whether the user is external to the account.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Opaque Wrike contact ID of the authenticated user. Example: "KUAZR5CO"'),
        type: z.string().describe('Contact type. Always "Person" for the authenticated user.'),
        me: z.boolean().describe('Always true; confirms this record is the requesting user.'),
        firstName: z.string().optional().describe('First name of the authenticated user.'),
        lastName: z.string().optional().describe('Last name of the authenticated user.'),
        timezone: z.string().optional().describe('Timezone ID of the user. Example: "America/New_York"'),
        locale: z.string().optional().describe('Locale of the user. Example: "en-US"'),
        title: z.string().optional().describe('Job title of the user.'),
        companyName: z.string().optional().describe('Company name of the user.'),
        phone: z.string().optional().describe('Phone number of the user.'),
        primaryEmail: z.string().optional().describe('Primary email address of the user.'),
        avatarUrl: z.string().optional().describe('URL of the user avatar image.'),
        profiles: z
            .array(ProfileSchema)
            .describe(
                'Account profiles for the authenticated user. A Nango connection maps to exactly one Wrike account, so this normally contains a single entry for the connection account.'
            )
    })
    .describe('Contact record of the Wrike user tied to the current connection.');

const ProviderProfileSchema = z.object({
    accountId: z.string(),
    email: z.string(),
    role: z.string(),
    admin: z.boolean(),
    owner: z.boolean(),
    active: z.boolean(),
    external: z.boolean().nullish()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    type: z.string(),
    me: z.boolean().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    timezone: z.string().nullish(),
    locale: z.string().nullish(),
    title: z.string().nullish(),
    companyName: z.string().nullish(),
    phone: z.string().nullish(),
    primaryEmail: z.string().nullish(),
    avatarUrl: z.string().nullish(),
    profiles: z.array(ProviderProfileSchema).nullish()
});

const ProviderResponseSchema = z.object({
    kind: z.string(),
    data: z.array(ProviderContactSchema)
});

/**
 * @tags: [read]
 * @tagReason: Reads the authenticated user's contact record; performs no provider mutation.
 */
const action = createAction({
    description: 'Get the contact record of the user/connection currently authenticated, including their account ID, admin/owner flags, and timezone.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.wrike.com/api/v4/contacts/
        const response = await nango.get({
            endpoint: '/contacts',
            params: {
                me: 'true'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const contact = parsed.data[0];

        if (!contact) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No authenticated user contact was returned for this connection.'
            });
        }

        return {
            id: contact.id,
            type: contact.type,
            me: contact.me ?? true,
            ...(contact.firstName != null && { firstName: contact.firstName }),
            ...(contact.lastName != null && { lastName: contact.lastName }),
            ...(contact.timezone != null && { timezone: contact.timezone }),
            ...(contact.locale != null && { locale: contact.locale }),
            ...(contact.title != null && { title: contact.title }),
            ...(contact.companyName != null && { companyName: contact.companyName }),
            ...(contact.phone != null && { phone: contact.phone }),
            ...(contact.primaryEmail != null && { primaryEmail: contact.primaryEmail }),
            ...(contact.avatarUrl != null && { avatarUrl: contact.avatarUrl }),
            profiles: (contact.profiles ?? []).map((profile) => ({
                accountId: profile.accountId,
                email: profile.email,
                role: profile.role,
                admin: profile.admin,
                owner: profile.owner,
                active: profile.active,
                ...(profile.external != null && { external: profile.external })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
