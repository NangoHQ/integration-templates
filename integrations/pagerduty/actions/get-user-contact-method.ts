import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        user_id: z.string().describe('The ID of the PagerDuty user who owns the contact method.'),
        contact_method_id: z.string().describe('The ID of the contact method to retrieve.')
    })
    .describe('Input for retrieving a specific PagerDuty user contact method.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier for the contact method.'),
        type: z.string().describe('The contact method type, such as email_contact_method or phone_contact_method.'),
        summary: z.string().optional().describe('A short summary or display name for the contact method.'),
        self: z.string().optional().describe('The API URL of the contact method resource.'),
        html_url: z.string().nullable().optional().describe('A URL to view the contact method in the PagerDuty web UI.'),
        label: z.string().optional().describe('A user-defined label for the contact method (e.g., Work, Mobile).'),
        address: z.string().optional().describe('The address to deliver to, such as an email address or phone number.'),
        send_short_email: z.boolean().optional().describe('Whether short email notifications are enabled for this contact method.'),
        send_html_email: z.boolean().optional().describe('Whether HTML email notifications are enabled for this contact method.'),
        enabled: z.boolean().optional().describe('Whether the contact method is currently enabled.')
    })
    .passthrough()
    .describe('A PagerDuty user contact method with its full details.');

const ProviderContactMethodSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        summary: z.string().nullish(),
        self: z.string().nullish(),
        html_url: z.string().nullish(),
        label: z.string().nullish(),
        address: z.string().nullish(),
        send_short_email: z.boolean().nullish(),
        send_html_email: z.boolean().nullish(),
        enabled: z.boolean().nullish()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    contact_method: ProviderContactMethodSchema
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single contact method from the PagerDuty API.
 * @pitfalls: User list and detail endpoints embed contact methods as reference summaries only; this action is required to retrieve full fields such as address, label, and enabled status.
 */
const action = createAction({
    description: 'Retrieve a single contact method for a user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:contact_methods.read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/e210330b7a2fb-get-a-user-s-contact-method
            endpoint: `/users/${encodeURIComponent(input.user_id)}/contact_methods/${encodeURIComponent(input.contact_method_id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const method = providerResponse.contact_method;

        return {
            id: method.id,
            type: method.type,
            ...(method.summary != null && { summary: method.summary }),
            ...(method.self != null && { self: method.self }),
            ...(method.html_url != null && { html_url: method.html_url }),
            ...(method.label != null && { label: method.label }),
            ...(method.address != null && { address: method.address }),
            ...(method.send_short_email != null && { send_short_email: method.send_short_email }),
            ...(method.send_html_email != null && { send_html_email: method.send_html_email }),
            ...(method.enabled != null && { enabled: method.enabled }),
            ...Object.fromEntries(
                Object.entries(method).filter(
                    ([key]) =>
                        !['id', 'type', 'summary', 'self', 'html_url', 'label', 'address', 'send_short_email', 'send_html_email', 'enabled'].includes(key)
                )
            )
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
