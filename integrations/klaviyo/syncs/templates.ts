import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TemplateSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    editor_type: z.string().optional(),
    html: z.string().optional(),
    text: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync templates.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Template: TemplateSchema
    },

    exec: async (nango) => {
        // Blocker: GET /api/templates does not expose an updated-since or modified-since filter,
        // deleted-record endpoint, or resumable cursor suitable for incremental sync.
        await nango.trackDeletesStart('Template');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.klaviyo.com/en/reference/get_templates
            endpoint: '/api/templates',
            params: {
                'page[size]': 10
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'links.next',
                response_path: 'data',
                limit_name_in_request: 'page[size]',
                limit: 10
            },
            retries: 3,
            headers: {
                revision: '2026-04-15'
            }
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items = z
                .array(
                    z.object({
                        id: z.string(),
                        type: z.string(),
                        attributes: z
                            .object({
                                name: z.string().optional().nullable(),
                                editor_type: z.string().optional().nullable(),
                                html: z.string().optional().nullable(),
                                text: z.string().optional().nullable(),
                                created_at: z.string().optional().nullable(),
                                updated_at: z.string().optional().nullable()
                            })
                            .passthrough()
                            .optional()
                    })
                )
                .parse(page);

            const templates = items.map((item) => ({
                id: item.id,
                ...(item.attributes?.name != null && { name: item.attributes.name }),
                ...(item.attributes?.editor_type != null && { editor_type: item.attributes.editor_type }),
                ...(item.attributes?.html != null && { html: item.attributes.html }),
                ...(item.attributes?.text != null && { text: item.attributes.text }),
                ...(item.attributes?.created_at != null && { created_at: item.attributes.created_at }),
                ...(item.attributes?.updated_at != null && { updated_at: item.attributes.updated_at })
            }));

            if (templates.length > 0) {
                await nango.batchSave(templates, 'Template');
            }
        }

        await nango.trackDeletesEnd('Template');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
