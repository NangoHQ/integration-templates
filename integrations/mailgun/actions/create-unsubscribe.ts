import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z
            .string()
            .describe(
                'The Mailgun domain whose unsubscribe suppression list the address is added to. Use the domain exactly as it appears on the account, e.g. "sandboxfa9654b57ed14d40a9460717cf55de03.mailgun.org" or "mg.example.com".'
            ),
        address: z.string().describe('The email address to add to the unsubscribes table, e.g. "user@example.com".'),
        tag: z
            .string()
            .optional()
            .describe(
                'Optional tag to unsubscribe the address from, limiting the suppression to messages sent with that tag. Omit to unsubscribe from all tags (Mailgun defaults to "*").'
            )
    })
    .describe('Input for adding an address to a Mailgun domain unsubscribe suppression list.');

const ProviderUnsubscribeSchema = z.object({
    address: z.string(),
    message: z.string()
});

const OutputSchema = z
    .object({
        address: z.string().describe('The email address that was added to the unsubscribes table.'),
        message: z.string().describe('Confirmation message returned by Mailgun, e.g. "Address has been added to the unsubscribes table".')
    })
    .describe('Result of adding the address to the unsubscribe suppression list.');

/**
 * @tags: [write]
 * @tagReason: Adds an address to the domain's unsubscribe suppression list, mutating provider state.
 * @pitfalls: Omitting tag unsubscribes the address from all tags (Mailgun default "*"), suppressing all mail sent to it through this domain until the suppression is explicitly removed. Re-adding an address that is already suppressed succeeds silently instead of returning a conflict.
 */
const action = createAction({
    description: "Manually add an address to a domain's unsubscribe suppression list.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Mailgun v3 requires form-encoded bodies, but the Nango proxy only forwards Content-Type when it is
        // prefixed (Nango-Proxy-Content-Type) and re-serializes an empty form/JSON body into a 400 "Invalid JSON"
        // upstream response, so the parameters must travel as query-string params (Mailgun accepts them
        // equivalently). The SDK's HTTP client still sends a default form Content-Type with an empty body on
        // body-less POSTs, which trips that same proxy behavior, so Content-Type is overridden to text/plain.
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/
            endpoint: `/v3/${encodeURIComponent(input.domain)}/unsubscribes`,
            params: {
                address: input.address,
                ...(input.tag !== undefined && { tag: input.tag })
            },
            headers: {
                'Content-Type': 'text/plain'
            },
            // Safe to retry: re-adding the same address with the same tag is an upsert on Mailgun's side,
            // so a repeated call after a lost response leaves the suppression table in the same state.
            retries: 3
        };

        const response = await nango.post(config);

        const parsed = ProviderUnsubscribeSchema.parse(response.data);

        return {
            address: parsed.address,
            message: parsed.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
