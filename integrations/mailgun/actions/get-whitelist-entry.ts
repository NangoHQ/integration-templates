import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('The Mailgun sending domain that owns the allowlist. Example: "mg.example.com"'),
        address: z.string().describe('The allowlisted address or domain to look up. Example: "alice@example.com"')
    })
    .describe('Parameters for looking up a single allowlist entry.');

const AllowlistEntrySchema = z.object({
    type: z.string(),
    value: z.string(),
    createdAt: z.string(),
    reason: z.string()
});

const OutputSchema = z
    .object({
        type: z.string().describe('Type of the allowlist entry, either "address" or "domain".'),
        value: z.string().describe('The allowlisted address or domain.'),
        createdAt: z.string().describe('Timestamp for when the entry was created, in RFC 2822 format. Example: "Fri, 02 Oct 2026 00:20:01 UTC"'),
        reason: z.string().describe('User-provided reason recorded when the entry was allowlisted. Empty string when none was given.')
    })
    .describe('The allowlist entry found for the requested address or domain.');

/**
 * @tags: [read]
 * @tagReason: Performs a single GET lookup against the provider and mutates nothing.
 * @pitfalls: A missing entry fails the action with a 404 error rather than returning an empty result.
 */
const action = createAction({
    description: 'Retrieve a single allowlist (whitelist) entry by address.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/allowlist
        const response = await nango.get({
            endpoint: `/v3/${encodeURIComponent(input.domain)}/whitelists/${encodeURIComponent(input.address)}`,
            retries: 3
        });

        const entry = AllowlistEntrySchema.parse(response.data);

        return {
            type: entry.type,
            value: entry.value,
            createdAt: entry.createdAt,
            reason: entry.reason
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
