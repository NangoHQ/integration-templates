import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('The Mailgun domain that owns the template. Example: "mg.example.com"'),
        name: z.string().describe('The name of the template to retrieve. Example: "welcome-email"')
    })
    .describe('Input for retrieving a single Mailgun template by domain and name');

const ProviderTemplateSchema = z.object({
    name: z.string(),
    description: z.string().nullish(),
    createdAt: z.string(),
    id: z.string(),
    domain: z.string()
});

const ProviderResponseSchema = z.object({
    template: ProviderTemplateSchema
});

const OutputSchema = z
    .object({
        name: z.string().describe('The template name'),
        description: z.string().optional().describe('The template description. Omitted when the template has no description'),
        createdAt: z.string().describe('Creation timestamp in RFC 2822 format. Example: "Fri, 02 Oct 2026 00:18:59 UTC"'),
        id: z.string().describe("Mailgun's internal template ID"),
        domain: z.string().describe('The domain that owns the template')
    })
    .describe('Template metadata returned by Mailgun for a single template');

/**
 * @tags: [read]
 * @tagReason: Only fetches a single template's metadata from the provider and mutates nothing.
 * @pitfalls: Returns template metadata only; the template's body content (its version's handlebars source) is not included in this response, so a caller needing the content itself must capture it from the create-template response instead.
 */
const action = createAction({
    description: "Retrieve a single template's details by name",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/ - GET /v3/{domain}/templates/{name}
            endpoint: `/v3/${encodeURIComponent(input.domain)}/templates/${encodeURIComponent(input.name)}`,
            retries: 3
        };

        const response = await nango.get(config);
        const { template } = ProviderResponseSchema.parse(response.data);

        return {
            name: template.name,
            ...(template.description != null && { description: template.description }),
            createdAt: template.createdAt,
            id: template.id,
            domain: template.domain
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
