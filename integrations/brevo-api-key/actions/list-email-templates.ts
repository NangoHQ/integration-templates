import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of templates returned per page. Defaults to 50 (max 1000). Example: 25'),
        offset: z.number().int().min(0).optional().describe('Index of the first template in the page (0-based). Defaults to 0. Example: 50'),
        templateStatus: z
            .boolean()
            .optional()
            .describe('Filter by template status: true returns only active templates, false only inactive ones. Omit to return all templates.'),
        sort: z.enum(['asc', 'desc']).optional().describe("Sort order by template creation date. Defaults to 'desc' (newest first).")
    })
    .describe('Filters and pagination for listing transactional email templates.');

const TemplateSenderSchema = z
    .object({
        name: z.string().optional().describe('Sender name of the template.'),
        email: z.string().optional().describe('From email address of the template.'),
        id: z.string().optional().describe('Sender ID in Brevo. Example: "1"')
    })
    .describe('Sender identity of the template.');

const TemplateSchema = z
    .object({
        id: z.number().describe('Unique numeric ID of the template. Example: 30'),
        name: z.string().describe('Name of the template.'),
        subject: z.string().describe('Subject line of the template.'),
        isActive: z.boolean().describe('Whether the template is active (true) or inactive (false).'),
        testSent: z.boolean().describe('Whether a test email has been sent for the template.'),
        sender: TemplateSenderSchema,
        replyTo: z.string().optional().describe('Reply-to email address defined for the template.'),
        toField: z.string().optional().describe('Customisation of the "to" field for the template; an empty string when not customised.'),
        tag: z.string().optional().describe('Tag associated with the template.'),
        htmlContent: z.string().optional().describe('Full HTML content of the template.'),
        createdAt: z.string().describe('UTC creation date-time of the template (YYYY-MM-DDTHH:mm:ss.SSSZ).'),
        modifiedAt: z.string().describe('UTC last-modification date-time of the template (YYYY-MM-DDTHH:mm:ss.SSSZ).')
    })
    .describe('A transactional email template.');

const OutputSchema = z
    .object({
        count: z.number().describe('Total number of transactional email templates matching the filters.'),
        templates: z.array(TemplateSchema).describe('Transactional email templates on the requested page.')
    })
    .describe('Paginated list of transactional email templates.');

// Internal schema for the raw provider response. Brevo returns a bare `{}` when the
// account has no templates, so both envelope keys must be optional here.
const ProviderResponseSchema = z.object({
    count: z.number().optional(),
    templates: z.array(TemplateSchema).optional()
});

/**
 * @tags: [read]
 * @tagReason: Performs a single GET to list transactional email templates; it creates, modifies, and deletes nothing in the provider.
 * @pitfalls: Every template entry includes its full HTML content, so pages can be large; keep `limit` small when only template metadata is needed. Newly created templates are inactive by default, so they only appear when `templateStatus` is omitted or false until activated.
 */
const action = createAction({
    description: "List the account's transactional email templates.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/getsmtptemplates
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/getsmtptemplates
            endpoint: '/smtp/templates',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.offset !== undefined && { offset: input.offset }),
                ...(input.templateStatus !== undefined && { templateStatus: String(input.templateStatus) }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ProviderResponseSchema.parse(response.data ?? {});

        return {
            count: parsed.count ?? 0,
            templates: parsed.templates ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
