import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('The Mailgun sending domain whose spam-complaint suppression list should be checked. Example: "mg.example.com".'),
        address: z.string().describe('The email address to look up on the domain\'s spam-complaint suppression list. Example: "user@example.com".')
    })
    .describe("Input for checking whether an address is on a domain's spam-complaint suppression list.");

const OutputSchema = z
    .object({
        on_complaint_list: z.boolean().describe("True when the address is present on the domain's spam-complaint suppression list."),
        address: z.string().optional().describe('The address as recorded on the complaints list. Present only when on_complaint_list is true.'),
        created_at: z
            .string()
            .optional()
            .describe(
                'RFC 2822 timestamp of when the spam complaint was recorded, e.g. "Fri, 02 Oct 2026 00:21:11 UTC". Present only when on_complaint_list is true.'
            )
    })
    .describe("Result of checking an address against a domain's spam-complaint suppression list.");

const ComplaintSchema = z.object({
    address: z.string().optional(),
    created_at: z.string().optional()
});

function isNotFoundError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return false;
    }
    const response: unknown = error.response;
    if (typeof response !== 'object' || response === null || !('status' in response)) {
        return false;
    }
    return response.status === 404;
}

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only lookup against the domain's spam-complaint suppression list and never mutates provider state.
 * @pitfalls: Spam-complaint suppressions are scoped per sending domain, and Mailgun's US and EU regions are entirely separate data stores; the same address can be listed on one domain and clear on another, so check the exact domain you send from.
 */
const action = createAction({
    description: "Check whether a specific address is on a domain's spam-complaint suppression list.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/ - GET /v3/{domain}/complaints/{address}
            endpoint: `/v3/${encodeURIComponent(input.domain)}/complaints/${encodeURIComponent(input.address)}`,
            retries: 3
        };

        // @allowTryCatch: Mailgun answers a plain 404 when the address has no complaints on this domain; that is an expected outcome mapped to on_complaint_list: false, not a failure.
        try {
            const response = await nango.get(config);
            const complaint = ComplaintSchema.parse(response.data);

            return {
                on_complaint_list: true,
                ...(complaint.address !== undefined && { address: complaint.address }),
                ...(complaint.created_at !== undefined && { created_at: complaint.created_at })
            };
        } catch (error: unknown) {
            if (isNotFoundError(error)) {
                return { on_complaint_list: false };
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
