import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('The Mailgun domain to list templates for. Example: "mg.example.com".'),
        limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .describe('Maximum number of templates to return per page, between 1 and 100. Omit to use the Mailgun default.'),
        cursor: z.string().optional().describe('Pagination pivot from the nextCursor field of a previous response. Omit to fetch the first page.')
    })
    .describe('Input for listing the stored message templates of a Mailgun domain.');

const TemplateSchema = z.object({
    name: z.string().describe('Name of the template.'),
    description: z.string().optional().describe('Description of the template.'),
    createdAt: z.string().optional().describe('Creation date of the template in RFC 2822 format. Example: "Wed, 29 Aug 2018 23:31:13 UTC".'),
    createdBy: z.string().optional().describe('Identity of the user who created the template, when provided by Mailgun.'),
    id: z.string().optional().describe('Unique identifier of the template.'),
    domain: z.string().optional().describe('Domain the template belongs to.')
});

const OutputSchema = z
    .object({
        items: z.array(TemplateSchema).describe('Stored templates of the domain for the requested page.'),
        nextCursor: z
            .string()
            .optional()
            .describe(
                'Pagination pivot for the next page, taken from the provider paging.next link. Pass it back as the cursor input; an empty items array marks the end of the list.'
            )
    })
    .describe('A page of stored Mailgun templates for a domain.');

const MailgunTemplateSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    createdAt: z.string().optional(),
    createdBy: z.string().optional(),
    id: z.string().optional(),
    domain: z.string().optional()
});

const MailgunTemplatesResponseSchema = z.object({
    items: z.array(MailgunTemplateSchema).nullable().optional(),
    paging: z
        .object({
            first: z.string().optional(),
            last: z.string().optional(),
            next: z.string().optional(),
            previous: z.string().optional()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Only lists templates through a read-only GET request and performs no provider-side mutation.
 * @pitfalls: Responses include template metadata only, not the template body or its versions. A returned nextCursor does not guarantee more results, because Mailgun always emits a next-page link; stop paginating when a page comes back empty. Templates are scoped per domain and Mailgun regions are isolated data stores, so the domain must exist in the region the connection is configured for.
 */
const action = createAction({
    description: 'List stored message templates for a domain',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/domain-templates/get-v3--domain-name--templates
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/domain-templates/get-v3--domain-name--templates
            endpoint: `/v3/${encodeURIComponent(input.domain)}/templates`,
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { page: 'next', p: input.cursor })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = MailgunTemplatesResponseSchema.parse(response.data);

        const items = (parsed.items ?? []).map((template) => ({
            name: template.name,
            ...(template.description !== undefined && { description: template.description }),
            ...(template.createdAt !== undefined && { createdAt: template.createdAt }),
            ...(template.createdBy !== undefined && { createdBy: template.createdBy }),
            ...(template.id !== undefined && { id: template.id }),
            ...(template.domain !== undefined && { domain: template.domain })
        }));

        let nextCursor: string | undefined;
        const nextPageUrl = parsed.paging?.next;
        if (nextPageUrl) {
            const pivotMatch = /[?&]p=([^&]*)/.exec(nextPageUrl);
            if (pivotMatch && pivotMatch[1]) {
                nextCursor = decodeURIComponent(pivotMatch[1]);
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
