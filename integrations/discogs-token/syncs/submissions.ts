import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const SubmissionSchema = z.object({
    id: z.string(),
    submission_id: z.number(),
    status: z.string().optional(),
    created: z.string().optional(),
    last_activity: z.string().optional(),
    type: z.string().optional(),
    title: z.string().optional(),
    artist: z.string().optional(),
    format: z.string().optional(),
    label: z.string().optional(),
    resource_url: z.string().optional()
});

const ProviderSubmissionSchema = z
    .object({
        id: z.number(),
        status: z.string().nullish(),
        created: z.string().nullish(),
        last_activity: z.string().nullish(),
        type: z.string().nullish(),
        title: z.string().nullish(),
        artist: z.string().nullish(),
        format: z.string().nullish(),
        label: z.string().nullish(),
        resource_url: z.string().nullish()
    })
    .passthrough();

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

        const proxyConfig: ProxyConfiguration = {
            // https://www.discogs.com/developers#page:user-submissions,header-user-submissions-submissions
            endpoint: `/users/${encodeURIComponent(username)}/submissions`,
            retries: 3,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                response_path: 'submissions',
                limit_name_in_request: 'per_page',
                limit: 100
            }
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const submissions = z.array(ProviderSubmissionSchema).parse(page);
            const records = submissions.map((submission) => ({
                id: String(submission.id),
                submission_id: submission.id,
                ...(submission.status != null && { status: submission.status }),
                ...(submission.created != null && { created: submission.created }),
                ...(submission.last_activity != null && { last_activity: submission.last_activity }),
                ...(submission.type != null && { type: submission.type }),
                ...(submission.title != null && { title: submission.title }),
                ...(submission.artist != null && { artist: submission.artist }),
                ...(submission.format != null && { format: submission.format }),
                ...(submission.label != null && { label: submission.label }),
                ...(submission.resource_url != null && { resource_url: submission.resource_url })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Submission');
            }
        }
        await nango.deleteRecordsFromPreviousExecutions('Submission');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
