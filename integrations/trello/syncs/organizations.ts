import { createSync } from 'nango';
import { z } from 'zod';

const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    displayName: z.string().optional(),
    desc: z.string().optional(),
    url: z.string().optional(),
    website: z.string().optional(),
    logoHash: z.string().optional(),
    products: z.array(z.number()).optional()
});

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    displayName: z.string().nullish(),
    desc: z.string().nullish(),
    url: z.string().nullish(),
    website: z.string().nullish(),
    logoHash: z.string().nullish(),
    products: z.array(z.number()).nullish()
});

const sync = createSync({
    description: 'Sync organizations (workspaces) the authenticated member belongs to.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Organization: OrganizationSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/organizations'
        }
    ],

    exec: async (nango) => {
        // Blocker: provider only exposes /1/members/me/organizations with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor. Members typically belong to a small number of orgs.
        await nango.trackDeletesStart('Organization');

        // https://developer.atlassian.com/cloud/trello/rest/api-group-members/#api-members-id-organizations-get
        const response = await nango.get({
            endpoint: '/1/members/me/organizations',
            retries: 3
        });

        const parsed = z.array(z.unknown()).safeParse(response.data);
        if (!parsed.success) {
            throw new Error('Failed to parse organizations response');
        }

        const organizations = parsed.data.map((org: unknown) => {
            const record = ProviderOrganizationSchema.parse(org);

            return {
                id: record.id,
                name: record.name,
                ...(record.displayName != null && { displayName: record.displayName }),
                ...(record.desc != null && { desc: record.desc }),
                ...(record.url != null && { url: record.url }),
                ...(record.website != null && { website: record.website }),
                ...(record.logoHash != null && { logoHash: record.logoHash }),
                ...(record.products != null && { products: record.products })
            };
        });

        if (organizations.length > 0) {
            await nango.batchSave(organizations, 'Organization');
        }

        await nango.trackDeletesEnd('Organization');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
