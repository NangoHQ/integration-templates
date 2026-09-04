import { createSync } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const SubmissionSchema = z.object({
    id: z.string(),
    entity_type: z.enum(['artist', 'label', 'release']),
    entity_id: z.number(),
    name: z.string().optional(),
    title: z.string().optional(),
    status: z.string().optional(),
    year: z.number().optional(),
    resource_url: z.string().optional(),
    date_added: z.string().optional(),
    artists_sort: z.string().optional()
});

const ProviderArtistSubmissionSchema = z
    .object({
        id: z.number(),
        name: z.string().nullish(),
        status: z.string().nullish(),
        resource_url: z.string().nullish()
    })
    .passthrough();

const ProviderLabelSubmissionSchema = z
    .object({
        id: z.number(),
        name: z.string().nullish(),
        status: z.string().nullish(),
        resource_url: z.string().nullish()
    })
    .passthrough();

const ProviderReleaseSubmissionSchema = z
    .object({
        id: z.number(),
        title: z.string().nullish(),
        status: z.string().nullish(),
        year: z.number().nullish(),
        resource_url: z.string().nullish(),
        date_added: z.string().nullish(),
        artists_sort: z.string().nullish()
    })
    .passthrough();

const ProviderSubmissionsPageSchema = z.object({
    pagination: z.object({
        page: z.number(),
        pages: z.number()
    }),
    submissions: z.object({
        artists: z.array(ProviderArtistSubmissionSchema).optional(),
        labels: z.array(ProviderLabelSubmissionSchema).optional(),
        releases: z.array(ProviderReleaseSubmissionSchema).optional()
    })
});

const sync = createSync({
    description: 'Sync release submissions for the authenticated user.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: false,
    syncType: 'full',
    endpoints: [{ method: 'GET', path: '/submissions', group: 'Submissions' }],
    models: { Submission: SubmissionSchema },
    metadata: z.object({}),

    exec: async (nango) => {
        const username = await getDiscogsUsername(nango);
        const perPage = 100;
        let page = 1;

        await nango.trackDeletesStart('Submission');

        while (true) {
            // https://www.discogs.com/developers#page:user-submissions,header-user-submissions-submissions
            const response = await nango.get({
                endpoint: `/users/${encodeURIComponent(username)}/submissions`,
                params: { page, per_page: perPage },
                retries: 3
            });

            const parsed = ProviderSubmissionsPageSchema.parse(response.data);
            const records: z.infer<typeof SubmissionSchema>[] = [];

            for (const artist of parsed.submissions.artists ?? []) {
                records.push({
                    id: `artist-${artist.id}`,
                    entity_type: 'artist',
                    entity_id: artist.id,
                    ...(artist.name != null && { name: artist.name }),
                    ...(artist.status != null && { status: artist.status }),
                    ...(artist.resource_url != null && { resource_url: artist.resource_url })
                });
            }

            for (const label of parsed.submissions.labels ?? []) {
                records.push({
                    id: `label-${label.id}`,
                    entity_type: 'label',
                    entity_id: label.id,
                    ...(label.name != null && { name: label.name }),
                    ...(label.status != null && { status: label.status }),
                    ...(label.resource_url != null && { resource_url: label.resource_url })
                });
            }

            for (const release of parsed.submissions.releases ?? []) {
                records.push({
                    id: `release-${release.id}`,
                    entity_type: 'release',
                    entity_id: release.id,
                    ...(release.title != null && { title: release.title }),
                    ...(release.status != null && { status: release.status }),
                    ...(release.year != null && { year: release.year }),
                    ...(release.resource_url != null && { resource_url: release.resource_url }),
                    ...(release.date_added != null && { date_added: release.date_added }),
                    ...(release.artists_sort != null && { artists_sort: release.artists_sort })
                });
            }

            if (records.length > 0) {
                await nango.batchSave(records, 'Submission');
            }

            if (parsed.pagination.page >= parsed.pagination.pages) {
                break;
            }
            page++;
        }

        await nango.trackDeletesEnd('Submission');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
