import { z } from 'zod';
import { createAction } from 'nango';

const SenderSchema = z.object({
    name: z.string().optional().describe('Display name of the sender. Example: "Acme Team"'),
    email: z
        .string()
        .optional()
        .describe(
            'Email address of an already-verified sender in the Brevo account. Exactly one of email or id must be provided. Example: "newsletter@acme.com"'
        ),
    id: z
        .number()
        .optional()
        .describe('Numeric ID of an already-verified sender in the Brevo account. Exactly one of email or id must be provided. Example: 123')
});

const InputSchema = z
    .object({
        templateName: z.string().describe('Name of the transactional email template. Example: "Order Confirmation - EN"'),
        subject: z.string().describe('Subject line of the email template. Example: "Thanks for your purchase!"'),
        sender: SenderSchema.describe('Sender details. Pass exactly one of email or id, identifying an already-verified sender in the Brevo account.'),
        htmlContent: z
            .string()
            .optional()
            .describe(
                'HTML body of the email message. Must be longer than 10 characters and may contain {{params.X}} placeholders. Required if htmlUrl is empty. Example: "<html><body><p>Hello {{params.firstName}}</p></body></html>"'
            ),
        htmlUrl: z
            .string()
            .optional()
            .describe(
                'Absolute URL that hosts the HTML body of the email message. Required if htmlContent is empty. Example: "https://example.com/templates/order-confirmation.html"'
            ),
        isActive: z.boolean().optional().describe('Whether the template is active and usable for sending. Defaults to false when omitted. Example: true'),
        replyTo: z.string().optional().describe('Email address that recipients reply to. Example: "support@acme.com"'),
        tag: z.string().optional().describe('Tag used to group and filter the template in Brevo statistics. Example: "orders"'),
        attachmentUrl: z
            .string()
            .optional()
            .describe('Absolute URL of a file to attach to every email sent from this template. Example: "https://example.com/files/terms.pdf"'),
        toField: z
            .string()
            .optional()
            .describe('Personalized To field, e.g. "{{contact.FNAME}} {{contact.LNAME}}", referencing existing Brevo contact attributes.')
    })
    .describe('Input for creating a Brevo transactional email template.');

const OutputSchema = z
    .object({
        id: z.number().describe('Numeric ID of the newly created transactional email template. Example: 5')
    })
    .describe('Result of creating a Brevo transactional email template.');

const CreateTemplateResponseSchema = z.object({
    id: z.number()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new transactional email template in the Brevo account.
 * @pitfalls: The sender email or id must belong to an already-verified sender in the Brevo account or the request is rejected. Pass exactly one of sender.email or sender.id, and at least one of htmlContent or htmlUrl. Templates are created inactive unless isActive is true, and an active template cannot be deleted until it is deactivated.
 */
const action = createAction({
    description: 'Create a new transactional email template',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const hasSenderEmail = input.sender.email !== undefined;
        const hasSenderId = input.sender.id !== undefined;
        if (hasSenderEmail === hasSenderId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide exactly one of sender.email or sender.id.'
            });
        }

        if (input.htmlContent === undefined && input.htmlUrl === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide at least one of htmlContent or htmlUrl.'
            });
        }

        // https://developers.brevo.com/reference/create-smtp-template
        const response = await nango.post({
            endpoint: '/smtp/templates',
            data: {
                templateName: input.templateName,
                subject: input.subject,
                sender: {
                    ...(input.sender.name !== undefined && { name: input.sender.name }),
                    ...(input.sender.email !== undefined && { email: input.sender.email }),
                    ...(input.sender.id !== undefined && { id: input.sender.id })
                },
                ...(input.htmlContent !== undefined && { htmlContent: input.htmlContent }),
                ...(input.htmlUrl !== undefined && { htmlUrl: input.htmlUrl }),
                ...(input.isActive !== undefined && { isActive: input.isActive }),
                ...(input.replyTo !== undefined && { replyTo: input.replyTo }),
                ...(input.tag !== undefined && { tag: input.tag }),
                ...(input.attachmentUrl !== undefined && { attachmentUrl: input.attachmentUrl }),
                ...(input.toField !== undefined && { toField: input.toField })
            },
            // Not idempotent: Brevo provides no idempotency key, so a retry after a lost response would create a duplicate template.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries: 0 is deliberate here.
            retries: 0
        });

        const created = CreateTemplateResponseSchema.parse(response.data);

        return {
            id: created.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
