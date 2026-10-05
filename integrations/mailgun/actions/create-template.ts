import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('The Mailgun domain to create the template on. Example: "sandbox1234abcd.mailgun.org"'),
        name: z.string().describe('Name of the template to create. Must be unique within the domain. Example: "welcome-email"'),
        description: z.string().optional().describe('Human-readable description of the template.'),
        template: z.string().optional().describe('Content of the template\'s initial version. Uses handlebars syntax by default. Example: "Hello {{name}}"'),
        tag: z.string().optional().describe('Tag for the initial version. Defaults to "initial" when omitted. Example: "v1"'),
        comment: z.string().optional().describe('Comment recorded with the initial version.')
    })
    .describe('Input for creating a Mailgun message template with its initial version.');

const OutputVersionSchema = z.object({
    id: z.string().optional().describe('Unique ID of the template version.'),
    tag: z.string().optional().describe('Tag of the version. Example: "initial"'),
    template: z.string().optional().describe('Content of this version (handlebars syntax by default).'),
    engine: z.string().optional().describe('Template engine of this version. Example: "handlebars"'),
    active: z.boolean().optional().describe('Whether this version is currently the active one.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the created template.'),
        name: z.string().describe('Name of the created template.'),
        description: z.string().optional().describe('Description of the template, present when one was set.'),
        createdAt: z.string().optional().describe('Timestamp when the template was created, in RFC 2822 format. Example: "Wed, 01 Oct 2026 12:00:00 GMT"'),
        domain: z.string().optional().describe('Domain the template belongs to.'),
        version: OutputVersionSchema.optional().describe("The template's initial version, including its content.")
    })
    .describe('The created Mailgun template with its initial version.');

const TemplateVersionSchema = z.object({
    id: z.string().optional(),
    tag: z.string().optional(),
    template: z.string().optional(),
    engine: z.string().optional(),
    active: z.boolean().optional()
});

const CreateTemplateResponseSchema = z.object({
    message: z.string().optional(),
    template: z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
        createdAt: z.string().optional(),
        domain: z.string().optional(),
        version: TemplateVersionSchema.optional()
    })
});

/**
 * @tags: [write]
 * @tagReason: Creates a new message template with its initial version on the provider, a provider-side mutation with no reads or deletes.
 * @pitfalls: Template names must be unique per domain, so re-creating an existing name fails. The response's domain field contains Mailgun's internal domain identifier, not the domain name supplied in the input. The version tag defaults to "initial" when omitted. Unlike the get/list template operations, the create response includes the initial version's content.
 */
const action = createAction({
    description: 'Create a new message template (with its initial version).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.mailgun.com/en/latest/api-templates.html
        // Mailgun requires form-encoded bodies, which the Nango proxy does not forward reliably, so parameters are sent as query-string params instead of a body.
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/en/latest/api-templates.html
            endpoint: `/v3/${encodeURIComponent(input.domain)}/templates`,
            params: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.template !== undefined && { template: input.template }),
                ...(input.tag !== undefined && { tag: input.tag }),
                ...(input.comment !== undefined && { comment: input.comment })
            },
            // Creating a template is not idempotent (no idempotency key); a retry after a lost response would repeat the mutation.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.post(config);

        const parsed = CreateTemplateResponseSchema.parse(response.data);
        const stored = parsed.template;

        return {
            id: stored.id,
            name: stored.name,
            ...(stored.description != null && { description: stored.description }),
            ...(stored.createdAt !== undefined && { createdAt: stored.createdAt }),
            ...(stored.domain !== undefined && { domain: stored.domain }),
            ...(stored.version !== undefined && {
                version: {
                    ...(stored.version.id !== undefined && { id: stored.version.id }),
                    ...(stored.version.tag !== undefined && { tag: stored.version.tag }),
                    ...(stored.version.template !== undefined && { template: stored.version.template }),
                    ...(stored.version.engine !== undefined && { engine: stored.version.engine }),
                    ...(stored.version.active !== undefined && { active: stored.version.active })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
