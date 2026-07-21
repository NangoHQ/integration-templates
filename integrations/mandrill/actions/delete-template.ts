import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The immutable slug of an existing template. Example: "example-template"')
});

const ProviderResponseSchema = z.object({
    slug: z.string(),
    name: z.string(),
    labels: z.array(z.string()).optional(),
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
    created_at: z.string(),
    updated_at: z.string(),
    draft_updated_at: z.string().nullable().optional(),
    is_broken_template: z.boolean()
});

const OutputSchema = z.object({
    slug: z.string().describe('Immutable unique identifier for the template.'),
    name: z.string().describe('Human-readable name of the template.'),
    labels: z.array(z.string()).optional().describe('Array of labels for filtering templates.'),
    code: z.string().optional().describe('Draft HTML code for the template.'),
    subject: z.string().optional().describe('Draft default subject line.'),
    from_email: z.string().optional().describe('Draft default sending address.'),
    from_name: z.string().optional().describe('Draft default from name.'),
    text: z.string().optional().describe('Draft default text part.'),
    publish_name: z.string().optional().describe('Published name of the template.'),
    publish_code: z.string().optional().describe('Published HTML code for the template.'),
    publish_subject: z.string().optional().describe('Published default subject line.'),
    publish_from_email: z.string().optional().describe('Published default sending address.'),
    publish_from_name: z.string().optional().describe('Published default from name.'),
    publish_text: z.string().optional().describe('Published default text part.'),
    published_at: z.string().optional().describe('Date and time when template was last published in UTC.'),
    created_at: z.string().describe('Date and time when template was created in UTC.'),
    updated_at: z.string().describe('Date and time when template was last updated in UTC.'),
    draft_updated_at: z.string().optional().describe('Date and time when template draft was last updated in UTC.'),
    is_broken_template: z.boolean().describe('Whether the template has broken syntax or references.')
});

const action = createAction({
    description: 'Delete a template.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/templates/delete-template/
            baseUrlOverride: 'https://mandrillapp.com/api/1.3',
            endpoint: '/templates/delete',
            data: {
                name: input.name
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            slug: providerResponse.slug,
            name: providerResponse.name,
            ...(providerResponse.labels !== undefined && { labels: providerResponse.labels }),
            ...(providerResponse.code != null && { code: providerResponse.code }),
            ...(providerResponse.subject != null && { subject: providerResponse.subject }),
            ...(providerResponse.from_email != null && { from_email: providerResponse.from_email }),
            ...(providerResponse.from_name != null && { from_name: providerResponse.from_name }),
            ...(providerResponse.text != null && { text: providerResponse.text }),
            ...(providerResponse.publish_name != null && { publish_name: providerResponse.publish_name }),
            ...(providerResponse.publish_code != null && { publish_code: providerResponse.publish_code }),
            ...(providerResponse.publish_subject != null && { publish_subject: providerResponse.publish_subject }),
            ...(providerResponse.publish_from_email != null && { publish_from_email: providerResponse.publish_from_email }),
            ...(providerResponse.publish_from_name != null && { publish_from_name: providerResponse.publish_from_name }),
            ...(providerResponse.publish_text != null && { publish_text: providerResponse.publish_text }),
            ...(providerResponse.published_at != null && { published_at: providerResponse.published_at }),
            created_at: providerResponse.created_at,
            updated_at: providerResponse.updated_at,
            ...(providerResponse.draft_updated_at != null && { draft_updated_at: providerResponse.draft_updated_at }),
            is_broken_template: providerResponse.is_broken_template
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
