import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().int().positive().optional().describe('Maximum number of domains to return. Example: 100'),
        skip: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe('Number of domains to skip (offset) before returning results. Use with limit to page through domains. Defaults to 0.')
    })
    .describe('Pagination options for listing domains.');

const DomainSchema = z
    .object({
        id: z.string().describe('Unique Mailgun identifier of the domain.'),
        name: z.string().describe('Fully qualified domain name. Example: "mg.example.com"'),
        type: z.string().optional().describe('Domain type as reported by Mailgun ("custom" or "sandbox").'),
        state: z.string().optional().describe('Domain state as reported by Mailgun (e.g. "active").'),
        created_at: z.string().optional().describe('Creation timestamp in RFC 2822 format. Example: "Fri, 23 Feb 2024 11:31:56 GMT"'),
        is_disabled: z.boolean().optional().describe('Whether the domain is disabled.'),
        require_tls: z.boolean().optional().describe('Whether Mailgun requires TLS for messages sent via this domain.'),
        skip_verification: z.boolean().optional().describe('Whether Mailgun skips DNS verification for this domain.'),
        smtp_login: z.string().optional().describe('SMTP login for the domain.'),
        spam_action: z.string().optional().describe('Spam action for the domain ("disabled" or "tag").'),
        use_automatic_sender_security: z.boolean().optional().describe('Whether Mailgun manages DKIM/SPF records automatically for the domain.'),
        web_prefix: z.string().optional().describe('Web prefix used for Mailgun tracking URLs on the domain.'),
        web_scheme: z.string().optional().describe('URL scheme used for Mailgun tracking URLs ("http" or "https").'),
        wildcard: z.boolean().optional().describe('Whether the domain is a wildcard domain.'),
        encrypt_incoming_message: z.boolean().optional().describe('Whether incoming messages are encrypted for the domain.'),
        message_ttl: z.number().optional().describe('Time-to-live in seconds for stored messages on the domain.')
    })
    .describe('A sending domain on the Mailgun account.');

const OutputSchema = z
    .object({
        domains: z.array(DomainSchema).describe('Sending domains on the account for the requested page.'),
        total_count: z.number().describe('Total number of domains on the account across all pages.')
    })
    .describe('Result of listing the sending domains on the Mailgun account.');

const DomainsResponseSchema = z.object({
    total_count: z.number(),
    items: z.array(DomainSchema)
});

/**
 * @tags: [read]
 * @tagReason: Performs a read-only GET against the Mailgun domains endpoint with no provider-side mutation.
 * @pitfalls: Results are scoped to the connection's configured Mailgun region: US and EU are entirely separate data stores, so domains from the other region are never returned even if the account uses both.
 */
const action = createAction({
    description: 'List sending domains on the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Domains/
        const response = await nango.get({
            endpoint: '/v3/domains',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.skip !== undefined && { skip: input.skip })
            },
            retries: 3
        });

        const parsed = DomainsResponseSchema.parse(response.data);

        return {
            domains: parsed.items,
            total_count: parsed.total_count
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
