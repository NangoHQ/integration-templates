import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        user_id: z.string().describe('PagerDuty user ID to add the contact method to. Example: "PJB72P3"'),
        type: z
            .enum(['email_contact_method', 'sms_contact_method', 'phone_contact_method', 'push_notification_contact_method'])
            .describe('Contact method type. Must be the bare type without the `_reference` suffix.'),
        label: z.string().describe('Descriptive label for this contact method. Example: "Work Email"'),
        address: z.string().describe('The contact address (email address, phone number, etc.). Example: "api@nango.dev"')
    })
    .describe('Input for creating a PagerDuty user contact method.');

const ProviderContactMethodSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    label: z.string(),
    address: z.string(),
    blacklisted: z.boolean().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The newly created contact method ID.'),
        type: z.string().describe('The contact method type.'),
        label: z.string().describe('The contact method label.'),
        address: z.string().describe('The contact method address.'),
        summary: z.string().optional().describe('A short summary of the contact method.'),
        self: z.string().optional().describe('API URL for this contact method.'),
        html_url: z.string().optional().describe('Web URL for this contact method.'),
        blacklisted: z.boolean().optional().describe('Whether this contact method is blacklisted.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the contact method was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the contact method was last updated.')
    })
    .describe('Output of a newly created PagerDuty user contact method.');

/**
 * @tags: [write]
 * @tagReason: Creates a new contact method on a PagerDuty user.
 * @pitfalls: Duplicate contact method addresses on the same user are rejected with a validation error.
 */
const action = createAction({
    description: 'Add a new contact method to a user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.pagerduty.com/api-reference/3ed581d84e0d8-create-a-user-contact-method
            endpoint: `/users/${encodeURIComponent(input.user_id)}/contact_methods`,
            data: {
                contact_method: {
                    type: input.type,
                    label: input.label,
                    address: input.address
                }
            },
            retries: 10
        });

        const providerContactMethod = ProviderContactMethodSchema.parse(response.data.contact_method);

        return {
            id: providerContactMethod.id,
            type: providerContactMethod.type,
            label: providerContactMethod.label,
            address: providerContactMethod.address,
            ...(providerContactMethod.summary != null && { summary: providerContactMethod.summary }),
            ...(providerContactMethod.self != null && { self: providerContactMethod.self }),
            ...(providerContactMethod.html_url != null && { html_url: providerContactMethod.html_url }),
            ...(providerContactMethod.blacklisted != null && { blacklisted: providerContactMethod.blacklisted }),
            ...(providerContactMethod.created_at != null && { created_at: providerContactMethod.created_at }),
            ...(providerContactMethod.updated_at != null && { updated_at: providerContactMethod.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
