import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Immutable name of an existing template. Example: "my-template"'),
    from_email: z.string().email().nullable().optional().describe('New default sending address'),
    from_name: z.string().nullable().optional().describe('New default from name'),
    subject: z.string().nullable().optional().describe('New default subject line'),
    code: z.string().nullable().optional().describe('New code for the template'),
    text: z.string().nullable().optional().describe('New default text part to be used'),
    publish: z.boolean().optional().describe('Set to false to update the draft version without publishing'),
    labels: z.array(z.string().max(100)).max(10).nullable().optional().describe('Optional array of up to 10 labels to use for filtering templates')
});

const ProviderTemplateSchema = z.object({
    slug: z.string(),
    name: z.string(),
    labels: z.array(z.string()),
    code: z.string().nullish(),
    subject: z.string().nullish(),
    from_email: z.string().nullish(),
    from_name: z.string().nullish(),
    text: z.string().nullish(),
    publish_name: z.string(),
    publish_code: z.string().nullish(),
    publish_subject: z.string().nullish(),
    publish_from_email: z.string().nullish(),
    publish_from_name: z.string().nullish(),
    publish_text: z.string().nullish(),
    published_at: z.string().nullish(),
    created_at: z.string(),
    updated_at: z.string(),
    draft_updated_at: z.string().nullish(),
    is_broken_template: z.boolean()
});

const OutputSchema = z.object({
    slug: z.string(),
    name: z.string(),
    labels: z.array(z.string()),
    code: z.string().optional(),
    subject: z.string().optional(),
    from_email: z.string().optional(),
    from_name: z.string().optional(),
    text: z.string().optional(),
    publish_name: z.string(),
    publish_code: z.string().optional(),
    publish_subject: z.string().optional(),
    publish_from_email: z.string().optional(),
    publish_from_name: z.string().optional(),
    publish_text: z.string().optional(),
    published_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    draft_updated_at: z.string().optional(),
    is_broken_template: z.boolean()
});

const action = createAction({
    description: 'Update the code/content of an existing template.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/templates/update-template/
            endpoint: '/1.0/templates/update',
            data: {
                name: input.name,
                ...(input.from_email !== undefined && { from_email: input.from_email }),
                ...(input.from_name !== undefined && { from_name: input.from_name }),
                ...(input.subject !== undefined && { subject: input.subject }),
                ...(input.code !== undefined && { code: input.code }),
                ...(input.text !== undefined && { text: input.text }),
                ...(input.publish !== undefined && { publish: input.publish }),
                ...(input.labels !== undefined && { labels: input.labels })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Template not found or update failed',
                name: input.name
            });
        }

        const providerTemplate = ProviderTemplateSchema.parse(response.data);

        return {
            slug: providerTemplate.slug,
            name: providerTemplate.name,
            labels: providerTemplate.labels,
            ...(providerTemplate.code != null && { code: providerTemplate.code }),
            ...(providerTemplate.subject != null && { subject: providerTemplate.subject }),
            ...(providerTemplate.from_email != null && { from_email: providerTemplate.from_email }),
            ...(providerTemplate.from_name != null && { from_name: providerTemplate.from_name }),
            ...(providerTemplate.text != null && { text: providerTemplate.text }),
            publish_name: providerTemplate.publish_name,
            ...(providerTemplate.publish_code != null && { publish_code: providerTemplate.publish_code }),
            ...(providerTemplate.publish_subject != null && { publish_subject: providerTemplate.publish_subject }),
            ...(providerTemplate.publish_from_email != null && { publish_from_email: providerTemplate.publish_from_email }),
            ...(providerTemplate.publish_from_name != null && { publish_from_name: providerTemplate.publish_from_name }),
            ...(providerTemplate.publish_text != null && { publish_text: providerTemplate.publish_text }),
            ...(providerTemplate.published_at != null && { published_at: providerTemplate.published_at }),
            created_at: providerTemplate.created_at,
            updated_at: providerTemplate.updated_at,
            ...(providerTemplate.draft_updated_at != null && { draft_updated_at: providerTemplate.draft_updated_at }),
            is_broken_template: providerTemplate.is_broken_template
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
