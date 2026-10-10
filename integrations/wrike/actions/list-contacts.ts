import { z } from 'zod';
import { createAction } from 'nango';

const ProviderUserProfileSchema = z.object({
    accountId: z.string().nullish(),
    email: z.string().nullish(),
    role: z.string().nullish(),
    admin: z.boolean().nullish(),
    owner: z.boolean().nullish(),
    active: z.boolean().nullish(),
    external: z.boolean().nullish()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    type: z.string().nullish(),
    primaryEmail: z.string().nullish(),
    profiles: z.array(ProviderUserProfileSchema).nullish(),
    deleted: z.boolean().nullish(),
    me: z.boolean().nullish(),
    myTeam: z.boolean().nullish(),
    memberIds: z.array(z.string()).nullish(),
    title: z.string().nullish(),
    companyName: z.string().nullish(),
    timezone: z.string().nullish(),
    locale: z.string().nullish(),
    phone: z.string().nullish(),
    location: z.string().nullish(),
    avatarUrl: z.string().nullish()
});

const ProviderContactsResponseSchema = z.object({
    kind: z.string(),
    data: z.array(ProviderContactSchema)
});

const UserProfileSchema = z.object({
    accountId: z.string().optional().describe('ID of the Wrike account this profile belongs to.'),
    email: z.string().optional().describe('Email address associated with the account.'),
    role: z.string().optional().describe('Role in the account: "User" or "Collaborator".'),
    admin: z.boolean().optional().describe('Whether the user is an account admin.'),
    owner: z.boolean().optional().describe('Whether the user is the account owner.'),
    active: z.boolean().optional().describe('Whether the user is active in the account.'),
    external: z.boolean().optional().describe('Whether the user is external to the account.')
});

const ContactSchema = z.object({
    id: z.string().describe('Unique contact ID.'),
    firstName: z.string().optional().describe('Contact first name.'),
    lastName: z.string().optional().describe('Contact last name.'),
    type: z.string().optional().describe('Contact type: "Person", "Group", "Asset", or "Robot".'),
    primaryEmail: z.string().optional().describe('Primary email address.'),
    profiles: z.array(UserProfileSchema).optional().describe('Account profiles associated with this contact.'),
    deleted: z.boolean().optional().describe('Whether the contact is deleted.'),
    me: z.boolean().optional().describe('Present and true only for the requesting user.'),
    myTeam: z.boolean().optional().describe('Present and true for the default "My Team" group.'),
    memberIds: z.array(z.string()).optional().describe('Contact IDs of group members; present only for groups.'),
    title: z.string().optional().describe('Job title.'),
    companyName: z.string().optional().describe('Company name.'),
    timezone: z.string().optional().describe('Timezone ID, for example "America/New_York".'),
    locale: z.string().optional().describe('Locale of the contact.'),
    phone: z.string().optional().describe('Phone number.'),
    location: z.string().optional().describe('Location.'),
    avatarUrl: z.string().optional().describe('Avatar image URL.')
});

const InputSchema = z.object({}).describe('No input parameters; returns every contact visible to the account.');

const OutputSchema = z
    .object({
        contacts: z.array(ContactSchema).describe('All contacts visible to the account: users, groups, and bot/robot accounts.')
    })
    .describe('All contacts visible to the account, including users, groups, and bot/robot accounts.');

/**
 * @tags: [read]
 * @tagReason: Reads contacts from the provider without modifying any provider state.
 * @pitfalls: Results mix Person, Group, Asset, and Robot contacts and the action exposes no type filter, so callers must filter client-side on type to get only human users.
 */
const action = createAction({
    description: 'List all contacts (users, groups, and bot/robot accounts) visible to this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.wrike.com/reference/getcontactsempty
            endpoint: '/contacts',
            retries: 3
        });

        const parsed = ProviderContactsResponseSchema.parse(response.data);

        const contacts = parsed.data.map((contact) => ({
            id: contact.id,
            ...(contact.firstName != null && { firstName: contact.firstName }),
            ...(contact.lastName != null && { lastName: contact.lastName }),
            ...(contact.type != null && { type: contact.type }),
            ...(contact.primaryEmail != null && { primaryEmail: contact.primaryEmail }),
            ...(contact.profiles != null && {
                profiles: contact.profiles.map((profile) => ({
                    ...(profile.accountId != null && { accountId: profile.accountId }),
                    ...(profile.email != null && { email: profile.email }),
                    ...(profile.role != null && { role: profile.role }),
                    ...(profile.admin != null && { admin: profile.admin }),
                    ...(profile.owner != null && { owner: profile.owner }),
                    ...(profile.active != null && { active: profile.active }),
                    ...(profile.external != null && { external: profile.external })
                }))
            }),
            ...(contact.deleted != null && { deleted: contact.deleted }),
            ...(contact.me != null && { me: contact.me }),
            ...(contact.myTeam != null && { myTeam: contact.myTeam }),
            ...(contact.memberIds != null && { memberIds: contact.memberIds }),
            ...(contact.title != null && { title: contact.title }),
            ...(contact.companyName != null && { companyName: contact.companyName }),
            ...(contact.timezone != null && { timezone: contact.timezone }),
            ...(contact.locale != null && { locale: contact.locale }),
            ...(contact.phone != null && { phone: contact.phone }),
            ...(contact.location != null && { location: contact.location }),
            ...(contact.avatarUrl != null && { avatarUrl: contact.avatarUrl })
        }));

        return { contacts };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
