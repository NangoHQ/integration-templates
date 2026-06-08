import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    project_id: z.string()
});

const ProviderAnnotationSchema = z.object({
    id: z.number(),
    content: z.string().nullable().optional(),
    date_marker: z.string().nullable().optional(),
    creation_type: z.string().optional(),
    dashboard_item: z.number().nullable().optional(),
    dashboard_id: z.number().nullable().optional(),
    dashboard_name: z.string().nullable().optional(),
    insight_short_id: z.string().nullable().optional(),
    insight_name: z.string().nullable().optional(),
    insight_derived_name: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    deleted: z.boolean().optional(),
    scope: z.string().optional()
});

const AnnotationSchema = z.object({
    id: z.string(),
    content: z.string().optional(),
    date_marker: z.string().optional(),
    creation_type: z.string().optional(),
    dashboard_item: z.number().optional(),
    dashboard_id: z.number().optional(),
    dashboard_name: z.string().optional(),
    insight_short_id: z.string().optional(),
    insight_name: z.string().optional(),
    insight_derived_name: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    deleted: z.boolean().optional(),
    scope: z.string().optional()
});

const sync = createSync({
    description: 'Sync annotations from PostHog',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Annotation: AnnotationSchema
    },
    // https://posthog.com/docs/api/annotations
    endpoints: [
        {
            path: '/syncs/annotations',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.parse(rawMetadata);

        await nango.trackDeletesStart('Annotation');

        // https://posthog.com/docs/api/annotations
        const proxyConfig: ProxyConfiguration = {
            // https://posthog.com/docs/api/annotations
            endpoint: `/api/projects/${encodeURIComponent(metadata.project_id)}/annotations/`,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'results'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const annotations = page.map((record: unknown) => {
                const data = ProviderAnnotationSchema.parse(record);
                return {
                    id: String(data.id),
                    ...(data.content != null && { content: data.content }),
                    ...(data.date_marker != null && { date_marker: data.date_marker }),
                    ...(data.creation_type != null && { creation_type: data.creation_type }),
                    ...(data.dashboard_item != null && { dashboard_item: data.dashboard_item }),
                    ...(data.dashboard_id != null && { dashboard_id: data.dashboard_id }),
                    ...(data.dashboard_name != null && { dashboard_name: data.dashboard_name }),
                    ...(data.insight_short_id != null && { insight_short_id: data.insight_short_id }),
                    ...(data.insight_name != null && { insight_name: data.insight_name }),
                    ...(data.insight_derived_name != null && { insight_derived_name: data.insight_derived_name }),
                    ...(data.created_at != null && { created_at: data.created_at }),
                    ...(data.updated_at != null && { updated_at: data.updated_at }),
                    ...(data.deleted != null && { deleted: data.deleted }),
                    ...(data.scope != null && { scope: data.scope })
                };
            });

            if (annotations.length > 0) {
                await nango.batchSave(annotations, 'Annotation');
            }
        }

        await nango.trackDeletesEnd('Annotation');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
