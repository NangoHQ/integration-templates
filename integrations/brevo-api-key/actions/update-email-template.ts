import { z } from 'zod';
import { createAction } from 'nango';

const SenderSchema = z
    .object({
        name: z.string().optional().describe('Display name of the sender. Example: "Nango"'),
        email: z.string().optional().describe('Email address of the sender. Mutually exclusive with sender id. Example: "sender@example.com"'),
        id: z.number().int().positive().optional().describe('Numeric ID of an existing sender. Mutually exclusive with sender email. Example: 1')
    })
    .describe('Sender details for the template. Pass either email or id, not both.');

const InputSchema = z
    .object({
        templateId: z
            .union([z.number().int().positive(), z.string().min(1)])
            .describe('ID of the transactional email template to update. Accepts a numeric template ID or a custom template identifier string. Example: 4'),
        templateName: z.string().optional().describe('New name of the template. Example: "Order confirmation"'),
        subject: z.string().optional().describe('New subject line of the email. Example: "Your order has shipped"'),
        htmlContent: z.string().optional().describe('New HTML body of the email. Must contain more than 10 characters.'),
        sender: SenderSchema.optional().describe('New sender details for the template.'),
        isActive: z.boolean().optional().describe('Set to false to deactivate the template or true to (re)activate it.')
    })
    .describe('Fields to update on a transactional email template. Only the provided fields are changed.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the template was updated successfully. The Brevo API returns 204 No Content on success.')
    })
    .describe('Result of the template update.');

/**
 * @tags: [write]
 * @tagReason: Mutates a transactional email template's fields or active status via a provider update call.
 * @pitfalls: Pass either sender.email or sender.id, not both, or the request fails with a 400. API-created templates default to inactive, so set isActive: true before the template can be used. Setting htmlContent removes the template's Drag & Drop editor access in the Brevo dashboard.
 */
const action = createAction({
    description: 'Update a transactional email template in Brevo',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: {
            templateName?: string;
            subject?: string;
            htmlContent?: string;
            sender?: z.infer<typeof SenderSchema>;
            isActive?: boolean;
        } = {
            ...(input.templateName !== undefined && { templateName: input.templateName }),
            ...(input.subject !== undefined && { subject: input.subject }),
            ...(input.htmlContent !== undefined && { htmlContent: input.htmlContent }),
            ...(input.sender !== undefined && { sender: input.sender }),
            ...(input.isActive !== undefined && { isActive: input.isActive })
        };

        // PUT is naturally idempotent here: retrying replays the same absolute field values, so the standard retry ceiling applies.
        // https://developers.brevo.com/reference/update-smtp-template
        await nango.put({
            endpoint: `/smtp/templates/${encodeURIComponent(String(input.templateId))}`,
            data,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
