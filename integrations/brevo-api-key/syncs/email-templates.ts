import { createSync } from 'nango';
import { z } from 'zod';

const SenderSchema = z
    .object({
        id: z.string().optional().describe('Brevo sender ID used as the "From" sender of the template, e.g. "1"'),
        name: z.string().optional().describe('Sender name shown as the "From" name, e.g. "Nango Test"'),
        email: z.string().optional().describe('Sender email address used as the "From" address, e.g. "api@nango.dev"')
    })
    .describe('Sender identity used as the "From" of the template');

const EmailTemplateSchema = z
    .object({
        id: z.string().describe('Unique Brevo transactional email template ID (numeric provider ID as a string), e.g. "5"'),
        name: z.string().describe('Name of the template, e.g. "SummerSales2017Template"'),
        subject: z.string().describe('Subject line of the transactional email, e.g. "Enjoy our summer Sales !"'),
        isActive: z
            .boolean()
            .describe('Whether the template is active (true) or inactive (false). An active template must be deactivated before Brevo allows it to be deleted'),
        testSent: z.boolean().describe('Whether a test email has been sent for this template'),
        sender: SenderSchema,
        replyTo: z
            .string()
            .describe('Email address defined as the "Reply-To" for the template. Brevo returns the literal "[DEFAULT_REPLY_TO]" when none was set'),
        toField: z.string().describe('Customisation of the "To" field for the template. Empty string when not customised'),
        tag: z.string().describe('Tag of the template used for grouping and filtering. Empty string when not set'),
        htmlContent: z.string().describe('Full HTML content of the template'),
        doiTemplate: z
            .boolean()
            .optional()
            .describe('True if the template is a valid Double opt-in (DOI) template. Only returned by the single-template detail endpoint'),
        customTemplateId: z.string().optional().describe('Custom template identifier. Only present when one was assigned during template creation'),
        createdAt: z.string().describe('Creation UTC date-time of the template (YYYY-MM-DDTHH:mm:ss.SSSZ), e.g. "2016-02-24T14:44:24.000Z"'),
        modifiedAt: z.string().describe('Last modification UTC date-time of the template (YYYY-MM-DDTHH:mm:ss.SSSZ), e.g. "2016-02-24T15:37:11.000Z"')
    })
    .describe('Brevo transactional email template');

const BrevoSenderSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional()
});

const BrevoTemplateSchema = z.object({
    id: z.number(),
    name: z.string(),
    subject: z.string(),
    isActive: z.boolean(),
    testSent: z.boolean(),
    sender: BrevoSenderSchema,
    replyTo: z.string(),
    toField: z.string(),
    tag: z.string(),
    htmlContent: z.string(),
    doiTemplate: z.boolean().optional(),
    customTemplateId: z.string().optional(),
    createdAt: z.string(),
    modifiedAt: z.string()
});

const BrevoTemplateListSchema = z.object({
    count: z.number().optional(),
    templates: z.array(BrevoTemplateSchema).optional()
});

const sync = createSync({
    description: 'Sync transactional email templates from Brevo (full refresh with delete detection)',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        EmailTemplate: EmailTemplateSchema
    },

    exec: async (nango) => {
        // Full refresh: GET /smtp/templates has no incremental/changed-since filter
        // (only templateStatus/editorType/limit/offset/sort), so every run walks the
        // entire template list from offset 0 and deletions are detected by diffing
        // the complete crawl via trackDeletesStart/trackDeletesEnd.
        await nango.trackDeletesStart('EmailTemplate');

        const limit = 100;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            // https://developers.brevo.com/reference/getsmtptemplates
            const response = await nango.get({
                endpoint: '/smtp/templates',
                params: {
                    limit: limit,
                    offset: offset
                },
                retries: 3
            });

            const parsed = BrevoTemplateListSchema.parse(response.data);
            // Gotcha confirmed live: when the account has zero templates the API
            // returns a bare `{}` with no `templates`/`count` keys at all, so a
            // missing `templates` key means "zero records", not a malformed response.
            const templates = parsed.templates ?? [];

            if (templates.length > 0) {
                await nango.batchSave(
                    templates.map((template) => ({
                        id: String(template.id),
                        name: template.name,
                        subject: template.subject,
                        isActive: template.isActive,
                        testSent: template.testSent,
                        sender: template.sender,
                        replyTo: template.replyTo,
                        toField: template.toField,
                        tag: template.tag,
                        htmlContent: template.htmlContent,
                        ...(template.doiTemplate !== undefined && { doiTemplate: template.doiTemplate }),
                        ...(template.customTemplateId !== undefined && { customTemplateId: template.customTemplateId }),
                        createdAt: template.createdAt,
                        modifiedAt: template.modifiedAt
                    })),
                    'EmailTemplate'
                );
            }

            offset += templates.length;
            hasMore = templates.length === limit && (parsed.count === undefined || offset < parsed.count);
        }

        await nango.trackDeletesEnd('EmailTemplate');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
