import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TemplateVersionSchema = z.object({
    id: z.string(),
    template_id: z.string().optional(),
    active: z.number().optional(),
    name: z.string().optional(),
    subject: z.string().optional(),
    updated_at: z.string().optional(),
    html_content: z.string().optional(),
    plain_content: z.string().optional(),
    generate_plain_content: z.boolean().optional(),
    editor: z.string().optional(),
    thumbnail_url: z.string().optional()
});

const TemplateSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    generation: z.string().optional(),
    updated_at: z.string().optional(),
    versions: z.array(TemplateVersionSchema).optional()
});

const sync = createSync({
    description: 'Sync dynamic templates and their versions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Template: TemplateSchema
    },

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/sendgrid/api-reference/templates#get-all-templates
            endpoint: '/v3/templates',
            params: {
                generations: 'dynamic',
                page_size: 10
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: '_metadata.next',
                response_path: 'result',
                limit_name_in_request: 'page_size',
                limit: 10
            },
            retries: 3
        };

        await nango.trackDeletesStart('Template');

        for await (const templates of nango.paginate(proxyConfig)) {
            const listItems = z.array(z.object({ id: z.string() })).safeParse(templates);
            if (!listItems.success) {
                throw new Error(`Failed to parse template list: ${listItems.error.message}`);
            }

            const details = [];

            for (const item of listItems.data) {
                const detailResponse = await nango.get({
                    // https://www.twilio.com/docs/sendgrid/api-reference/templates#get-a-single-template
                    endpoint: `/v3/templates/${encodeURIComponent(item.id)}`,
                    retries: 3
                });

                const detail = TemplateSchema.safeParse(detailResponse.data);
                if (!detail.success) {
                    throw new Error(`Failed to parse template ${item.id}: ${detail.error.message}`);
                }

                details.push(detail.data);
            }

            if (details.length > 0) {
                await nango.batchSave(details, 'Template');
            }
        }

        await nango.trackDeletesEnd('Template');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
