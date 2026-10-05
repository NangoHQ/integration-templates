import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain_name: z.string().describe('Mailgun sending domain that owns the allowlist. Example: "mg.example.com"'),
        address: z
            .string()
            .optional()
            .describe(
                'Email address to add to the allowlist. Required unless "domain" is provided; takes priority over "domain" when both are sent. Example: "user@example.com"'
            ),
        domain: z
            .string()
            .optional()
            .describe(
                'Entire domain to add to the allowlist. Required unless "address" is provided; ignored when "address" is also sent. Example: "example.com"'
            )
    })
    .describe('Input for adding an entry to a sending domain allowlist. Provide either "address" or "domain".');

const ProviderResponseSchema = z.object({
    message: z.string(),
    type: z.string(),
    value: z.string()
});

const OutputSchema = z
    .object({
        message: z.string().describe('Provider confirmation message. Example: "Address/Domain has been added to the allowlists table"'),
        type: z.string().describe('Type of allowlist entry created, either "address" or "domain"'),
        value: z.string().describe('The address or domain that was added to the allowlist')
    })
    .describe('Result of adding an entry to the sending domain allowlist');

/**
 * @tags: [write]
 * @tagReason: Adds a new entry to the sending domain's allowlist on the provider.
 * @pitfalls: Provide either "address" or "domain"; when both are sent, Mailgun prioritizes "address". Re-adding an already-allowlisted entry succeeds with the same confirmation, so the output does not indicate whether the entry already existed.
 */
const action = createAction({
    description: "Add an address or domain to a domain's sending allowlist, bypassing spam filtering for it.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.address === undefined && input.domain === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either "address" or "domain" must be provided.'
            });
        }

        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/allowlist/post-v3--domainid--whitelists
            endpoint: `/v3/${encodeURIComponent(input.domain_name)}/whitelists`,
            params: {
                ...(input.address !== undefined && { address: input.address }),
                ...(input.domain !== undefined && { domain: input.domain })
            },
            // Naturally idempotent: re-adding an existing allowlist entry returns the same 200, verified live.
            retries: 3
        };

        const response = await nango.post(config);

        const entry = ProviderResponseSchema.parse(response.data);

        return {
            message: entry.message,
            type: entry.type,
            value: entry.value
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
