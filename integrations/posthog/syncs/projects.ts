import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderProjectSchema = z.object({
    id: z.number().int(),
    uuid: z.string().nullish(),
    organization: z.string().nullish(),
    name: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    timezone: z.string().nullish(),
    is_demo: z.boolean().nullish(),
    ingested_event: z.boolean().nullish(),
    access_control: z.boolean().nullish()
});

const ProjectSchema = z.object({
    id: z.string(),
    uuid: z.string().optional(),
    organization: z.string().optional(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    timezone: z.string().optional(),
    is_demo: z.boolean().optional(),
    ingested_event: z.boolean().optional(),
    access_control: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync projects from PostHog.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Project: ProjectSchema
    },
    // https://posthog.com/docs/api/projects
    endpoints: [{ method: 'GET', path: '/syncs/projects' }],

    exec: async (nango) => {
        await nango.trackDeletesStart('Project');

        const proxyConfig: ProxyConfiguration = {
            // https://posthog.com/docs/api/projects
            endpoint: '/api/projects/',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'results'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const results = z.array(ProviderProjectSchema).safeParse(page);
            if (!results.success) {
                throw new Error(`Failed to parse projects page: ${results.error.message}`);
            }

            const projects = results.data.map((record) => ({
                id: String(record.id),
                ...(record.uuid != null && { uuid: record.uuid }),
                ...(record.organization != null && { organization: record.organization }),
                ...(record.name != null && { name: record.name }),
                ...(record.created_at != null && { created_at: record.created_at }),
                ...(record.updated_at != null && { updated_at: record.updated_at }),
                ...(record.timezone != null && { timezone: record.timezone }),
                ...(record.is_demo != null && { is_demo: record.is_demo }),
                ...(record.ingested_event != null && { ingested_event: record.ingested_event }),
                ...(record.access_control != null && { access_control: record.access_control })
            }));

            if (projects.length > 0) {
                await nango.batchSave(projects, 'Project');
            }
        }

        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
