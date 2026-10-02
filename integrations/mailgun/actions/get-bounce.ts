import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('The Mailgun domain whose bounce suppression list is checked. Example: "mg.example.com"'),
        address: z.string().describe('The email address to look up on the bounce list. Example: "user@example.com"')
    })
    .describe('Lookup parameters for checking one address against a domain bounce suppression list.');

const OutputSchema = z
    .object({
        bounced: z.boolean().describe('Whether the address is currently on the domain bounce suppression list.'),
        address: z.string().describe('The email address that was checked. Example: "user@example.com"'),
        code: z.string().optional().describe('The SMTP error code recorded for the bounce. Only present when the address is on the list. Example: "550"'),
        error: z.string().optional().describe('The error description recorded for the bounce. Only present when the address is on the list.'),
        created_at: z
            .string()
            .optional()
            .describe(
                'RFC 2822 timestamp of when the bounce was recorded. Only present when the address is on the list. Example: "Fri, 02 Oct 2026 00:22:36 UTC"'
            )
    })
    .describe('Result of checking an address against a domain bounce suppression list.');

const ProviderBounceSchema = z.object({
    address: z.string(),
    code: z.string().optional(),
    error: z.string().optional(),
    created_at: z.string().optional()
});

function isNotFoundError(err: unknown): boolean {
    if (typeof err !== 'object' || err === null || !('response' in err)) {
        return false;
    }
    const response = err.response;
    if (typeof response !== 'object' || response === null || !('status' in response)) {
        return false;
    }
    return response.status === 404;
}

/**
 * @tags: [read]
 * @tagReason: Performs a single GET against the provider and never mutates provider state.
 * @pitfalls: The bounce list contains only permanent delivery failures; soft bounces such as a full mailbox are never added, so bounced: false does not prove the address is deliverable.
 */
const action = createAction({
    description: 'Check whether a specific address is on a domain bounce suppression list',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch: Mailgun returns 404 when the address is not on the bounce list; that is a normal lookup outcome reported as bounced: false, not a failure.
        try {
            const config: ProxyConfiguration = {
                // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/bounces/get-v3--domainid--bounces--address-
                endpoint: `/v3/${encodeURIComponent(input.domain)}/bounces/${encodeURIComponent(input.address)}`,
                retries: 3
            };
            const response = await nango.get(config);
            const bounce = ProviderBounceSchema.parse(response.data);

            return {
                bounced: true,
                address: bounce.address,
                ...(bounce.code !== undefined && { code: bounce.code }),
                ...(bounce.error !== undefined && { error: bounce.error }),
                ...(bounce.created_at !== undefined && { created_at: bounce.created_at })
            };
        } catch (err) {
            if (isNotFoundError(err)) {
                return {
                    bounced: false,
                    address: input.address
                };
            }
            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
