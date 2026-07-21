import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the template to publish. Example: "my-template"')
});

const ProviderTemplateInfoSchema = z.object({
    slug: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    labels: z.array(z.string()).nullable().optional(),
    code: z.string().nullable().optional(),
    subject: z.string().nullable().optional(),
    from_email: z.string().nullable().optional(),
    from_name: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
    publish_name: z.string().nullable().optional(),
    publish_code: z.string().nullable().optional(),
    publish_subject: z.string().nullable().optional(),
    publish_from_email: z.string().nullable().optional(),
    publish_from_name: z.string().nullable().optional(),
    publish_text: z.string().nullable().optional(),
    published_at: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const OutputSchema = z.object({
    slug: z.string().optional(),
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
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Publish the draft content of a template so it becomes the live version.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://mailchimp.com/developer/transactional/api/templates/publish-template-content/
        const response = await nango.post({
            endpoint: '/1.0/templates/publish',
            data: {
                name: input.name
            },
            retries: 3
        });

        const providerTemplate = ProviderTemplateInfoSchema.parse(response.data);

        return {
            ...(providerTemplate.slug !== undefined && providerTemplate.slug != null && { slug: providerTemplate.slug }),
            ...(providerTemplate.name !== undefined && providerTemplate.name != null && { name: providerTemplate.name }),
            ...(providerTemplate.labels !== undefined && providerTemplate.labels != null && { labels: providerTemplate.labels }),
            ...(providerTemplate.code !== undefined && providerTemplate.code != null && { code: providerTemplate.code }),
            ...(providerTemplate.subject !== undefined && providerTemplate.subject != null && { subject: providerTemplate.subject }),
            ...(providerTemplate.from_email !== undefined && providerTemplate.from_email != null && { from_email: providerTemplate.from_email }),
            ...(providerTemplate.from_name !== undefined && providerTemplate.from_name != null && { from_name: providerTemplate.from_name }),
            ...(providerTemplate.text !== undefined && providerTemplate.text != null && { text: providerTemplate.text }),
            ...(providerTemplate.publish_name !== undefined && providerTemplate.publish_name != null && { publish_name: providerTemplate.publish_name }),
            ...(providerTemplate.publish_code !== undefined && providerTemplate.publish_code != null && { publish_code: providerTemplate.publish_code }),
            ...(providerTemplate.publish_subject !== undefined &&
                providerTemplate.publish_subject != null && { publish_subject: providerTemplate.publish_subject }),
            ...(providerTemplate.publish_from_email !== undefined &&
                providerTemplate.publish_from_email != null && { publish_from_email: providerTemplate.publish_from_email }),
            ...(providerTemplate.publish_from_name !== undefined &&
                providerTemplate.publish_from_name != null && { publish_from_name: providerTemplate.publish_from_name }),
            ...(providerTemplate.publish_text !== undefined && providerTemplate.publish_text != null && { publish_text: providerTemplate.publish_text }),
            ...(providerTemplate.published_at !== undefined && providerTemplate.published_at != null && { published_at: providerTemplate.published_at }),
            ...(providerTemplate.created_at !== undefined && providerTemplate.created_at != null && { created_at: providerTemplate.created_at }),
            ...(providerTemplate.updated_at !== undefined && providerTemplate.updated_at != null && { updated_at: providerTemplate.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
