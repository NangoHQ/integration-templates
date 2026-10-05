import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z.string().describe('The Mailgun domain whose unsubscribe suppression list to check. Example: "mg.example.com"'),
        address: z.string().describe('The email address to look up in the unsubscribe suppression list. Example: "user@example.com"')
    })
    .describe("Input for checking whether an email address is on a Mailgun domain's unsubscribe suppression list.");

const ProviderUnsubscribeSchema = z.object({
    address: z.string(),
    tags: z.array(z.string()).optional(),
    created_at: z.string().optional()
});

const OutputSchema = z
    .object({
        on_unsubscribe_list: z.boolean().describe('Whether the address currently has an unsubscribe suppression record on the domain.'),
        address: z.string().describe('The email address that was checked.'),
        tags: z.array(z.string()).optional().describe('The tags the address unsubscribed from. Only present when the address is on the unsubscribe list.'),
        created_at: z
            .string()
            .optional()
            .describe('When the unsubscribe record was created, in RFC 2822 format. Only present when the address is on the unsubscribe list.')
    })
    .describe("Result of checking an email address against a Mailgun domain's unsubscribe suppression list.");

function isNotFoundError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    if (!('response' in error)) {
        return false;
    }
    const response: unknown = error.response;
    if (typeof response !== 'object' || response === null) {
        return false;
    }
    if (!('status' in response)) {
        return false;
    }
    return response.status === 404;
}

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET against the provider and never mutates any resource.
 * @pitfalls: A tags value of ["*"] means the address unsubscribed from all messages on the domain, not from a specific tag.
 */
const action = createAction({
    description: "Check whether a specific address is on a domain's unsubscribe suppression list.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/unsubscribes/get-v3--domain--unsubscribes--address-
            endpoint: `/v3/${encodeURIComponent(input.domain)}/unsubscribes/${encodeURIComponent(input.address)}`,
            retries: 3
        };

        // @allowTryCatch Mailgun uses 404 as the normal "address is not on the unsubscribe list" signal, so the action converts that one status into an on_unsubscribe_list=false result while letting every other error propagate.
        try {
            const response = await nango.get(config);
            const unsubscribe = ProviderUnsubscribeSchema.parse(response.data);

            return {
                on_unsubscribe_list: true,
                address: unsubscribe.address,
                ...(unsubscribe.tags !== undefined && { tags: unsubscribe.tags }),
                ...(unsubscribe.created_at !== undefined && { created_at: unsubscribe.created_at })
            };
        } catch (error) {
            if (isNotFoundError(error)) {
                return {
                    on_unsubscribe_list: false,
                    address: input.address
                };
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
