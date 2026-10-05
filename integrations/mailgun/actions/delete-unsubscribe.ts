import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('The Mailgun domain whose unsubscribe suppression list is modified. Example: "mg.example.com".'),
        address: z.string().describe('Email address to remove from the unsubscribe suppression list. Example: "user@example.com".')
    })
    .describe('Input for removing an address from a Mailgun domain unsubscribe suppression list.');

const OutputSchema = z
    .object({
        address: z.string().describe('The email address that was removed from the unsubscribe suppression list.'),
        message: z.string().describe('Confirmation message returned by Mailgun. Example: "Unsubscribe event has been removed".')
    })
    .describe('Result of removing an address from the unsubscribe suppression list.');

const UnsubscribeDeleteResponseSchema = z.object({
    address: z.string(),
    message: z.string()
});

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an address from a domain's unsubscribe suppression list, a difficult-to-reverse provider mutation.
 * @pitfalls: Mailgun returns a 404 error if the address is not currently on the domain's unsubscribe list, so removing an already-removed or never-suppressed address fails instead of succeeding silently.
 */
const action = createAction({
    description: 'Remove an address from a domain unsubscribe suppression list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/ - DELETE /v3/{domain}/unsubscribes/{address}
            endpoint: `/v3/${encodeURIComponent(input.domain)}/unsubscribes/${encodeURIComponent(input.address)}`,
            // Not idempotent: a retry after a lost response repeats the delete and Mailgun returns 404 once the address is already removed.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.delete(config);

        const parsed = UnsubscribeDeleteResponseSchema.parse(response.data);

        return {
            address: parsed.address,
            message: parsed.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
