import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ContactProfileSchema = z
    .object({
        accountId: z.string().describe('The Wrike account ID this profile belongs to.'),
        email: z.string().optional().describe("The contact's email address for this account; omitted for groups and some robot users."),
        role: z.enum(['User', 'Collaborator']).describe('The role the contact holds in this account.'),
        external: z.boolean().describe('Whether the contact is external to the account.'),
        admin: z.boolean().describe('Whether the contact is an account administrator.'),
        owner: z.boolean().describe('Whether the contact is the account owner.'),
        active: z.boolean().describe('Whether the contact is active in the account.')
    })
    .describe('A contact profile for one account accessible to the requesting user.');

const ContactMetadataSchema = z
    .object({
        key: z.string().describe('Metadata entry key.'),
        value: z.string().describe('Metadata entry value.')
    })
    .describe('A key/value metadata entry attached to the contact.');

const ContactSchema = z
    .object({
        id: z.string().describe('Unique Wrike contact ID (opaque string, e.g. "KUAZR5CO").'),
        type: z.enum(['Group', 'Asset', 'Person', 'Robot']).optional().describe('Contact type: Person, Group, Robot, or Asset.'),
        firstName: z.string().optional().describe("The contact's first name."),
        lastName: z.string().optional().describe("The contact's last name."),
        title: z.string().optional().describe("The contact's job title."),
        companyName: z.string().optional().describe("The contact's company name."),
        phone: z.string().optional().describe("The contact's phone number."),
        location: z.string().optional().describe("The contact's location."),
        locale: z.string().optional().describe('The contact\'s locale, e.g. "en".'),
        timezone: z.string().optional().describe('The contact\'s timezone ID, e.g. "America/New_York".'),
        primaryEmail: z.string().optional().describe("The contact's primary email address."),
        avatarUrl: z.string().optional().describe("URL of the contact's avatar image."),
        deleted: z.boolean().optional().describe('Whether the contact has been deleted.'),
        me: z.boolean().optional().describe('Present and true only for the requesting user.'),
        myTeam: z.boolean().optional().describe('Present and true only for the default "My Team" group.'),
        memberIds: z.array(z.string()).optional().describe('IDs of the group members; present only for groups.'),
        metadata: z.array(ContactMetadataSchema).optional().describe('Metadata entries attached to the contact.'),
        profiles: z.array(ContactProfileSchema).optional().describe('Profiles of this contact in each account accessible to the requesting user.')
    })
    .describe('A Wrike contact (user, group, robot, or asset) visible to the account.');

const ProviderResponseSchema = z.object({
    kind: z.string(),
    data: z.array(z.unknown())
});

const sync = createSync({
    description: 'Sync every contact (user, group, bot) visible to the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        // This endpoint has no pagination and no changed-since filter (confirmed live:
        // pageSize/nextPageToken are rejected and no updatedDate filter exists), so this
        // is a full refresh. trackDeletesStart/End removes contacts no longer returned.
        await nango.trackDeletesStart('Contact');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.wrike.com/reference/getcontactsempty
            endpoint: '/contacts',
            params: {
                deleted: 'false'
            },
            retries: 3
        };

        const response = await nango.get(proxyConfig);
        const parsed = ProviderResponseSchema.parse(response.data);
        const contacts = parsed.data.map((raw) => ContactSchema.parse(raw));

        if (contacts.length > 0) {
            await nango.batchSave(contacts, 'Contact');
        }

        await nango.trackDeletesEnd('Contact');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
