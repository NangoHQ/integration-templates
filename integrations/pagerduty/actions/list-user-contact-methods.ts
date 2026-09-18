import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        userId: z.string().describe('The unique identifier of the PagerDuty user whose contact methods should be listed.')
    })
    .describe("Input for listing a PagerDuty user's contact methods.");

const ContactMethodSchema = z.object({
    id: z.string().describe('The unique identifier of the contact method.'),
    type: z
        .string()
        .describe('The type of contact method, such as email_contact_method, phone_contact_method, sms_contact_method, or push_notification_contact_method.'),
    summary: z.string().describe('A short summary of the contact method.'),
    label: z.string().optional().describe('A user-defined label for the contact method.'),
    address: z.string().optional().describe('The address or destination of the contact method, such as an email address or phone number.'),
    device_type: z.string().optional().describe('The device type for push notification contact methods.'),
    country_code: z.number().optional().describe('The numeric country code for phone or SMS contact methods.'),
    enabled: z.boolean().optional().describe('Whether the contact method is enabled for notifications.'),
    self: z.string().optional().describe('The API URL for this contact method resource.'),
    html_url: z.string().optional().describe('The PagerDuty web URL for this contact method resource.')
});

const OutputSchema = z
    .object({
        contact_methods: z.array(ContactMethodSchema).describe('The list of contact methods configured for the specified user.')
    })
    .describe("Output containing a PagerDuty user's contact methods.");

/**
 * @tags: [read]
 * @tagReason: Performs a read-only GET request to retrieve a user's contact methods.
 */
const action = createAction({
    description: "List a user's contact methods (email, SMS, phone, push channels).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:contact_methods.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.pagerduty.com/api-reference/e67a1c6089e1a-list-a-user-s-contact-methods
        const response = await nango.get({
            endpoint: `/users/${encodeURIComponent(input.userId)}/contact_methods`,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            contact_methods: z.array(z.unknown()).optional(),
            total: z.number().optional()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const contactMethods = (providerResponse.contact_methods || []).map((item: unknown) => {
            const raw = z
                .object({
                    id: z.string(),
                    type: z.string(),
                    summary: z.string(),
                    label: z.string().nullable().optional(),
                    address: z.string().nullable().optional(),
                    device_type: z.string().nullable().optional(),
                    country_code: z.number().nullable().optional(),
                    enabled: z.boolean().nullable().optional(),
                    self: z.string().nullable().optional(),
                    html_url: z.string().nullable().optional()
                })
                .parse(item);

            return {
                id: raw.id,
                type: raw.type,
                summary: raw.summary,
                ...(raw.label != null && { label: raw.label }),
                ...(raw.address != null && { address: raw.address }),
                ...(raw.device_type != null && { device_type: raw.device_type }),
                ...(raw.country_code != null && { country_code: raw.country_code }),
                ...(raw.enabled != null && { enabled: raw.enabled }),
                ...(raw.self != null && { self: raw.self }),
                ...(raw.html_url != null && { html_url: raw.html_url })
            };
        });

        return {
            contact_methods: contactMethods
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
