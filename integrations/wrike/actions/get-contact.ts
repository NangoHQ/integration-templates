import { z } from 'zod';
import { createAction } from 'nango';

const ProviderProfileSchema = z.object({
    accountId: z.string().nullish(),
    email: z.string().nullish(),
    role: z.enum(['User', 'Collaborator']).nullish(),
    external: z.boolean().nullish(),
    admin: z.boolean().nullish(),
    owner: z.boolean().nullish(),
    active: z.boolean().nullish()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    type: z.enum(['Group', 'Asset', 'Person', 'Robot']).nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    profiles: z.array(ProviderProfileSchema).nullish(),
    avatarUrl: z.string().nullish(),
    timezone: z.string().nullish(),
    locale: z.string().nullish(),
    deleted: z.boolean().nullish(),
    me: z.boolean().nullish(),
    myTeam: z.boolean().nullish(),
    title: z.string().nullish(),
    companyName: z.string().nullish(),
    phone: z.string().nullish(),
    primaryEmail: z.string().nullish(),
    memberIds: z.array(z.string()).nullish()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderContactSchema)
});

const ProfileSchema = z.object({
    accountId: z.string().optional().describe('ID of the account the profile belongs to.'),
    email: z.string().optional().describe('Email address associated with the profile; omitted for some group contacts.'),
    role: z.enum(['User', 'Collaborator']).optional().describe('Role of the contact in the account.'),
    external: z.boolean().optional().describe('Whether the contact is external to the account.'),
    admin: z.boolean().optional().describe('Whether the contact is an account admin.'),
    owner: z.boolean().optional().describe('Whether the contact is the account owner.'),
    active: z.boolean().optional().describe('Whether the contact is active in the account.')
});

const InputSchema = z
    .object({
        contactId: z.string().describe('ID of the contact (user, group, or bot) to retrieve. Example: "KUAZR5CO"')
    })
    .describe('Input for retrieving a single Wrike contact by ID.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique contact ID.'),
        type: z.enum(['Group', 'Asset', 'Person', 'Robot']).optional().describe('Contact type: Person, Group, Robot, or Asset.'),
        firstName: z.string().optional().describe('Contact first name.'),
        lastName: z.string().optional().describe('Contact last name.'),
        profiles: z.array(ProfileSchema).optional().describe('User profiles in the accounts accessible to the requesting user.'),
        avatarUrl: z.string().optional().describe('URL of the contact avatar image.'),
        timezone: z.string().optional().describe('Contact timezone ID, for example "America/New_York".'),
        locale: z.string().optional().describe('Contact locale, for example "en".'),
        deleted: z.boolean().optional().describe('Whether the contact is deleted.'),
        me: z.boolean().optional().describe('Present and true only when the contact is the requesting user.'),
        myTeam: z.boolean().optional().describe('Present and true for the default "My Team" group.'),
        title: z.string().optional().describe('Contact job title.'),
        companyName: z.string().optional().describe('Contact company name.'),
        phone: z.string().optional().describe('Contact phone number.'),
        primaryEmail: z.string().optional().describe('Contact primary email address.'),
        memberIds: z.array(z.string()).optional().describe('Contact IDs of the group members; present only for group contacts.')
    })
    .describe('A single Wrike contact (user, group, bot, or asset) with its profile details.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single contact from the provider without mutating any provider state.
 * @pitfalls: Requesting an unknown or malformed contact ID returns HTTP 400 invalid_request instead of a not-found result, so callers cannot distinguish a missing contact from an invalid ID.
 */
const action = createAction({
    description: 'Retrieve a single contact (user, group, or bot) by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.wrike.com/reference/getcontactsmulti
        const response = await nango.get({
            endpoint: `/contacts/${encodeURIComponent(input.contactId)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const contact = parsed.data[0];

        if (!contact) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found',
                contactId: input.contactId
            });
        }

        return {
            id: contact.id,
            ...(contact.type != null && { type: contact.type }),
            ...(contact.firstName != null && { firstName: contact.firstName }),
            ...(contact.lastName != null && { lastName: contact.lastName }),
            ...(contact.profiles != null && {
                profiles: contact.profiles.map((profile) => ({
                    ...(profile.accountId != null && { accountId: profile.accountId }),
                    ...(profile.email != null && { email: profile.email }),
                    ...(profile.role != null && { role: profile.role }),
                    ...(profile.external != null && { external: profile.external }),
                    ...(profile.admin != null && { admin: profile.admin }),
                    ...(profile.owner != null && { owner: profile.owner }),
                    ...(profile.active != null && { active: profile.active })
                }))
            }),
            ...(contact.avatarUrl != null && { avatarUrl: contact.avatarUrl }),
            ...(contact.timezone != null && { timezone: contact.timezone }),
            ...(contact.locale != null && { locale: contact.locale }),
            ...(contact.deleted != null && { deleted: contact.deleted }),
            ...(contact.me != null && { me: contact.me }),
            ...(contact.myTeam != null && { myTeam: contact.myTeam }),
            ...(contact.title != null && { title: contact.title }),
            ...(contact.companyName != null && { companyName: contact.companyName }),
            ...(contact.phone != null && { phone: contact.phone }),
            ...(contact.primaryEmail != null && { primaryEmail: contact.primaryEmail }),
            ...(contact.memberIds != null && { memberIds: contact.memberIds })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
