import { createSync, type ProxyConfiguration } from 'nango';
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

const CheckpointSchema = z.object({
    page: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync organizations (workspaces) the authenticated member belongs to.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
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
        // no deleted-record endpoint, and no resumable cursor. We keep a full
        // refresh and checkpoint pagination progress for resume support.
        const rawCheckpoint = await nango.getCheckpoint();
        let page = 0;
        if (rawCheckpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            page = parsedCheckpoint.data.page;
        }

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('Organization');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/trello/rest/api-group-members/#api-members-id-organizations-get
            endpoint: '/1/members/me/organizations',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderOrganizationSchema).safeParse(pageResults);
            if (!parsed.success) {
                throw new Error(`Failed to parse organizations response: ${parsed.error.message}`);
            }

            const organizations = parsed.data.map((org) => ({
                id: org.id,
                name: org.name,
                ...(org.displayName != null && { displayName: org.displayName }),
                ...(org.desc != null && { desc: org.desc }),
                ...(org.url != null && { url: org.url }),
                ...(org.website != null && { website: org.website }),
                ...(org.logoHash != null && { logoHash: org.logoHash }),
                ...(org.products != null && { products: org.products })
            }));

            if (organizations.length > 0) {
                await nango.batchSave(organizations, 'Organization');
            }

            // Save pagination progress after every page. Without this, a run that
            // exceeds the execution window restarts from page 0 next time instead of
            // resuming where it left off.
            page = page + 1;
            await nango.saveCheckpoint({ page });
        }

        // Clear the checkpoint only after the last page has been saved, then close the
        // delete-tracking window opened by trackDeletesStart().
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Organization');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
