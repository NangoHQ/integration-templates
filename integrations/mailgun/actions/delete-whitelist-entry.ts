import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('The Mailgun sending domain whose allowlist the entry is removed from. Example: "mg.example.com"'),
        address: z.string().describe('The email address or domain to remove from the allowlist. Example: "user@example.com"')
    })
    .describe('Input for deleting a single entry from a Mailgun domain allowlist.');

const OutputSchema = z
    .object({
        message: z.string().describe('Confirmation message returned by Mailgun. Example: "Allowlist address/domain has been removed"'),
        value: z.string().describe('The address or domain that was removed from the allowlist. Example: "user@example.com"')
    })
    .describe('Result of deleting a single entry from a Mailgun domain allowlist.');

const ProviderDeleteResponseSchema = z.object({
    message: z.string(),
    value: z.string()
});

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a provider-side allowlist entry, permanently removing an address or domain from the domain's sending allowlist.
 * @pitfalls: Deleting an address or domain that is not currently on the allowlist fails with a not-found error instead of succeeding silently.
 */
const action = createAction({
    description: 'Remove an address or domain from the sending allowlist of a Mailgun domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/allowlist/delete-v3--domainid--whitelists--value-
            endpoint: `/v3/${encodeURIComponent(input.domain)}/whitelists/${encodeURIComponent(input.address)}`,
            // Not idempotent: retrying after a lost-but-successful delete would 404 and mask the original success.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.delete(config);

        const parsed = ProviderDeleteResponseSchema.parse(response.data);

        return {
            message: parsed.message,
            value: parsed.value
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
