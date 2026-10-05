import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('The domain whose bounce suppression list to add the address to. Example: "sandbox1234abcd.mailgun.org"'),
        address: z.email().describe('The email address to add to the bounce suppression list. Example: "user@example.com"'),
        code: z.string().optional().describe('The SMTP error code to record for the bounce. Defaults to "550" on Mailgun\'s side when omitted. Example: "550"'),
        error: z.string().optional().describe('A human-readable description of the bounce reason. Example: "Mailbox does not exist"')
    })
    .describe("Input for manually adding an address to a Mailgun domain's bounce suppression list.");

const OutputSchema = z
    .object({
        message: z.string().describe('Confirmation message returned by Mailgun. Example: "Address has been added to the bounces table"'),
        address: z.string().describe('The email address that was added to the bounce suppression list. Example: "user@example.com"')
    })
    .describe('Result of adding an address to the bounce suppression list.');

const ProviderBounceSchema = z.object({
    message: z.string(),
    address: z.string()
});

/**
 * @tags: [write]
 * @tagReason: Adds an address to a domain's bounce suppression list, mutating provider state.
 * @pitfalls: Mailgun rejects future sends to a suppressed address until the entry is explicitly removed. Suppression is per-domain and does not affect other domains on the account. Re-adding an already-suppressed address succeeds again rather than returning an error.
 */
const action = createAction({
    description: "Manually add an address to a domain's bounce suppression list.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = new URLSearchParams({ address: input.address });
        if (input.code !== undefined) {
            body.append('code', input.code);
        }
        if (input.error !== undefined) {
            body.append('error', input.error);
        }

        // Mailgun's v3 API requires a form-urlencoded body for this endpoint, so the body is sent pre-encoded with an explicit form Content-Type.
        const config: ProxyConfiguration = {
            method: 'POST',
            // https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Bounces/
            endpoint: `/v3/${encodeURIComponent(input.domain)}/bounces`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: body.toString(),
            // Idempotent in effect: Mailgun keys bounce records by address, so a retry simply overwrites the same entry.
            retries: 3
        };
        const response = await nango.post(config);

        const parsed = ProviderBounceSchema.parse(response.data);

        return {
            message: parsed.message,
            address: parsed.address
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
