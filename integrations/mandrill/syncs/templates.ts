import { createSync } from 'nango';
import { z } from 'zod';

const ProviderTemplateSchema = z.object({
    slug: z.string(),
    name: z.string().nullish(),
    labels: z.array(z.string()).optional(),
    code: z.string().nullish(),
    subject: z.string().nullish(),
    from_email: z.string().nullish(),
    from_name: z.string().nullish(),
    text: z.string().nullish(),
    publish_name: z.string().nullish(),
    publish_code: z.string().nullish(),
    publish_subject: z.string().nullish(),
    publish_from_email: z.string().nullish(),
    publish_from_name: z.string().nullish(),
    publish_text: z.string().nullish(),
    published_at: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    is_broken_template: z.boolean().optional()
});

const TemplateSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string().optional(),
    labels: z.array(z.string()).optional(),
    code: z.string().optional(),
    subject: z.string().optional(),
    from_email: z.string().optional(),
    from_name: z.string().optional(),
    text: z.string().optional(),
    publish_name: z.string().optional(),
    publish_code: z.string().optional(),
    publish_subject: z.string().optional(),
    publish_from_email: z.string().optional(),
    publish_from_name: z.string().optional(),
    publish_text: z.string().optional(),
    published_at: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    is_broken_template: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync all Mandrill templates.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Template: TemplateSchema
    },

    exec: async (nango) => {
        // Blocker: POST /templates/list returns the full collection in a single call
        // with no pagination parameters and no modified-since/updated-after filter documented.
        await nango.trackDeletesStart('Template');

        // https://mailchimp.com/developer/transactional/api/templates/list-templates/
        const response = await nango.post({
            endpoint: '/1.0/templates/list.json',
            retries: 3
        });

        const parsed = z.array(ProviderTemplateSchema).safeParse(response.data);

        if (!parsed.success) {
            throw new Error(`Failed to parse templates/list response: ${parsed.error.message}`);
        }

        const templates = parsed.data.map((template) => ({
            id: template.slug,
            slug: template.slug,
            ...(template.name != null && { name: template.name }),
            ...(template.labels != null && { labels: template.labels }),
            ...(template.code != null && { code: template.code }),
            ...(template.subject != null && { subject: template.subject }),
            ...(template.from_email != null && { from_email: template.from_email }),
            ...(template.from_name != null && { from_name: template.from_name }),
            ...(template.text != null && { text: template.text }),
            ...(template.publish_name != null && { publish_name: template.publish_name }),
            ...(template.publish_code != null && { publish_code: template.publish_code }),
            ...(template.publish_subject != null && { publish_subject: template.publish_subject }),
            ...(template.publish_from_email != null && { publish_from_email: template.publish_from_email }),
            ...(template.publish_from_name != null && { publish_from_name: template.publish_from_name }),
            ...(template.publish_text != null && { publish_text: template.publish_text }),
            ...(template.published_at != null && { published_at: template.published_at }),
            ...(template.created_at != null && { created_at: template.created_at }),
            ...(template.updated_at != null && { updated_at: template.updated_at }),
            ...(template.is_broken_template != null && { is_broken_template: template.is_broken_template })
        }));

        if (templates.length > 0) {
            await nango.batchSave(templates, 'Template');
        }

        await nango.trackDeletesEnd('Template');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
