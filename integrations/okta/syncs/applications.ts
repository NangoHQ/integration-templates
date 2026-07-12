import { createSync } from 'nango';
import { z } from 'zod';

const OktaAppSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        label: z.string(),
        status: z.string(),
        lastUpdated: z.string(),
        created: z.string(),
        signOnMode: z.string().optional().nullable(),
        features: z.array(z.string()).optional().nullable()
    })
    .passthrough();

const ApplicationSchema = z.object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    status: z.string(),
    lastUpdated: z.string(),
    created: z.string(),
    signOnMode: z.string().optional(),
    features: z.array(z.string()).optional()
});

const sync = createSync({
    description: 'Sync applications.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Application: ApplicationSchema
    },

    exec: async (nango) => {
        // Blocker: Okta /api/v1/apps does not support a changed-since filter, deleted-record
        // endpoint, or resumable cursor for changed rows. Full snapshot with delete tracking
        // is required.
        await nango.trackDeletesStart('Application');

        // https://developer.okta.com/docs/reference/api/apps/
        const applications = nango.paginate({
            endpoint: '/api/v1/apps',
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'limit',
                limit: 200
            },
            retries: 3
        });

        for await (const page of applications) {
            const mapped = page.map((record) => {
                const parsed = OktaAppSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse application: ${parsed.error.message}`);
                }
                const app = parsed.data;
                return {
                    id: app.id,
                    name: app.name,
                    label: app.label,
                    status: app.status,
                    lastUpdated: app.lastUpdated,
                    created: app.created,
                    ...(app.signOnMode != null && { signOnMode: app.signOnMode }),
                    ...(app.features != null && { features: app.features })
                };
            });

            if (mapped.length === 0) {
                continue;
            }

            await nango.batchSave(mapped, 'Application');
        }

        await nango.trackDeletesEnd('Application');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
