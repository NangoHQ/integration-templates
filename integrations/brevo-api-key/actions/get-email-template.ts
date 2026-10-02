import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        templateId: z
            .union([z.number().int().positive(), z.string().min(1)])
            .describe('ID of the template to retrieve. Accepts the numeric template ID (e.g. 6) or a custom template identifier string assigned at creation.')
    })
    .describe('Input for retrieving a single transactional email template');

const SenderSchema = z
    .object({
        email: z.string().optional().describe('From email address for the template'),
        id: z.union([z.string(), z.number()]).optional().describe('ID of the sender associated with the template'),
        name: z.string().optional().describe('Name of the sender for the template')
    })
    .describe('Sender details of the template');

const OutputSchema = z
    .object({
        id: z.number().describe('Unique numeric ID of the template'),
        name: z.string().describe('Name of the template'),
        subject: z.string().describe('Subject line of the template email'),
        isActive: z.boolean().describe('Whether the template is active'),
        testSent: z.boolean().describe('Whether a test email has been sent for this template'),
        sender: SenderSchema,
        replyTo: z
            .string()
            .describe('Email address defined as the "Reply to" for the template. Brevo returns the literal "[DEFAULT_REPLY_TO]" when none was set.'),
        toField: z.string().describe('Customisation of the "To" field for the template. Empty string when not set.'),
        tag: z.string().describe('Tag of the template. Empty string when not set.'),
        htmlContent: z.string().describe('HTML content of the template'),
        createdAt: z.string().describe('Creation UTC date-time of the template (YYYY-MM-DDTHH:mm:ss.SSSZ)'),
        modifiedAt: z.string().describe('Last modification UTC date-time of the template (YYYY-MM-DDTHH:mm:ss.SSSZ)'),
        doiTemplate: z
            .boolean()
            .optional()
            .describe('True when the template is a valid double opt-in (DOI) template. Only present on a single-template detail response.'),
        customTemplateId: z.string().optional().describe('Custom template identifier. Only present when one was assigned during template creation.')
    })
    .describe('Detail of a single Brevo transactional email template');

/**
 * @tags: [read]
 * @tagReason: Performs a single provider GET to fetch one transactional email template; makes no provider-side changes.
 */
const action = createAction({
    description: "Retrieve a single transactional email template's detail.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/get-smtp-template
            endpoint: `/smtp/templates/${encodeURIComponent(String(input.templateId))}`,
            retries: 3
        };
        const response = await nango.get(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
