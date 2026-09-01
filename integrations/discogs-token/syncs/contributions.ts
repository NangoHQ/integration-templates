import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const ContributionSchema = z.object({
    id: z.string(),
    release_id: z.number(),
    artist: z.string().optional(),
    title: z.string().optional(),
    year: z.number().optional(),
    format: z.string().optional(),
    label: z.string().optional(),
    resource_url: z.string().optional(),
    role: z.string().optional(),
    anv: z.string().optional()
});

const ProviderContributionSchema = z
    .object({
        id: z.number(),
        artist: z.string().nullish(),
        title: z.string().nullish(),
        year: z.number().nullish(),
        format: z.string().nullish(),
        label: z.string().nullish(),
        resource_url: z.string().nullish(),
        role: z.string().nullish(),
        anv: z.string().nullish()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync release contributions for the authenticated user.',
    version: '1.0.0',
    frequency: 'every week',
    autoStart: false,
    syncType: 'full',
    endpoints: [{ method: 'GET', path: '/contributions', group: 'Contributions' }],
    models: { Contribution: ContributionSchema },
    metadata: z.object({}),

    exec: async (nango) => {
        const username = await getDiscogsUsername(nango);

        const proxyConfig: ProxyConfiguration = {
            // https://www.discogs.com/developers#page:user-contributions,header-user-contributions-contributions
            endpoint: `/users/${encodeURIComponent(username)}/contributions`,
            retries: 3,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                response_path: 'releases',
                limit_name_in_request: 'per_page',
                limit: 100
            }
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const releases = z.array(ProviderContributionSchema).parse(page);
            const records = releases.map((release) => ({
                id: String(release.id),
                release_id: release.id,
                ...(release.artist != null && { artist: release.artist }),
                ...(release.title != null && { title: release.title }),
                ...(release.year != null && { year: release.year }),
                ...(release.format != null && { format: release.format }),
                ...(release.label != null && { label: release.label }),
                ...(release.resource_url != null && { resource_url: release.resource_url }),
                ...(release.role != null && { role: release.role }),
                ...(release.anv != null && { anv: release.anv })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Contribution');
            }
        }
        await nango.deleteRecordsFromPreviousExecutions('Contribution');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
