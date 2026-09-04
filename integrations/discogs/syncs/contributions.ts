import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const ContributionSchema = z.object({
    id: z.string(),
    release_id: z.number(),
    title: z.string().optional(),
    year: z.number().optional(),
    status: z.string().optional(),
    resource_url: z.string().optional(),
    date_added: z.string().optional(),
    artists_sort: z.string().optional(),
    artists: z.array(z.record(z.string(), z.unknown())).optional(),
    labels: z.array(z.record(z.string(), z.unknown())).optional(),
    formats: z.array(z.record(z.string(), z.unknown())).optional(),
    role: z.string().optional(),
    anv: z.string().optional()
});

const ProviderContributionSchema = z
    .object({
        id: z.number(),
        title: z.string().nullish(),
        year: z.number().nullish(),
        status: z.string().nullish(),
        resource_url: z.string().nullish(),
        date_added: z.string().nullish(),
        artists_sort: z.string().nullish(),
        artists: z.array(z.record(z.string(), z.unknown())).nullish(),
        labels: z.array(z.record(z.string(), z.unknown())).nullish(),
        formats: z.array(z.record(z.string(), z.unknown())).nullish(),
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

        await nango.trackDeletesStart('Contribution');

        const proxyConfig: ProxyConfiguration = {
            // https://www.discogs.com/developers#page:user-contributions,header-user-contributions-contributions
            endpoint: `/users/${encodeURIComponent(username)}/contributions`,
            retries: 3,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                response_path: 'contributions',
                limit_name_in_request: 'per_page',
                limit: 100
            }
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const releases = z.array(ProviderContributionSchema).parse(page);
            const records = releases.map((release) => ({
                id: String(release.id),
                release_id: release.id,
                ...(release.title != null && { title: release.title }),
                ...(release.year != null && { year: release.year }),
                ...(release.status != null && { status: release.status }),
                ...(release.resource_url != null && { resource_url: release.resource_url }),
                ...(release.date_added != null && { date_added: release.date_added }),
                ...(release.artists_sort != null && { artists_sort: release.artists_sort }),
                ...(release.artists != null && release.artists.length > 0 && { artists: release.artists }),
                ...(release.labels != null && release.labels.length > 0 && { labels: release.labels }),
                ...(release.formats != null && release.formats.length > 0 && { formats: release.formats }),
                ...(release.role != null && { role: release.role }),
                ...(release.anv != null && { anv: release.anv })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Contribution');
            }
        }
        await nango.trackDeletesEnd('Contribution');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
