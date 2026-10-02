import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        ip: z
            .string()
            .optional()
            .describe(
                'Filter senders to those associated with a specific dedicated IP address. Only usable on accounts with dedicated IPs. Example: "203.0.113.100".'
            ),
        domain: z.string().optional().describe('Filter senders to those associated with a specific domain. Example: "example.com".')
    })
    .describe('Optional filters for listing the verified senders of the account.');

const SenderIpSchema = z
    .object({
        domain: z.string().describe('Domain of the dedicated IP. Example: "example.com".'),
        ip: z.string().describe('Dedicated IP address available in the account. Example: "203.0.113.100".'),
        weight: z.number().describe('Weight of the IP for this sender, used to distribute sending volume across IPs. Example: 100.')
    })
    .describe('A dedicated IP assignment for a sender.');

const SenderSchema = z
    .object({
        id: z.number().describe('Numeric ID of the sender. Example: 1.'),
        name: z.string().describe('From name associated with the sender. Example: "NangoDev".'),
        email: z.string().describe('Verified from email address of the sender. Example: "api@nango.dev".'),
        active: z.boolean().describe('Whether the sender is activated (true) or deactivated (false).'),
        ips: z.array(SenderIpSchema).describe('Dedicated IPs assigned to the sender. Empty for standard accounts without dedicated IPs.')
    })
    .describe('A verified sender on the Brevo account.');

const OutputSchema = z
    .object({
        senders: z.array(SenderSchema).describe('List of verified senders available on the account.')
    })
    .describe('The verified senders configured on the account.');

const ProviderSendersResponseSchema = z.object({
    senders: z
        .array(
            z.object({
                id: z.number(),
                name: z.string(),
                email: z.string(),
                active: z.boolean(),
                ips: z.array(
                    z.object({
                        domain: z.string(),
                        ip: z.string(),
                        weight: z.number()
                    })
                )
            })
        )
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Only performs a GET to list the account's verified senders; nothing is created, modified, or deleted on the provider.
 * @pitfalls: The ip filter is only usable on accounts with dedicated IPs. Deactivated senders are included in the results; filter on the active flag if only senders ready for use are needed.
 */
const action = createAction({
    description: "List the account's verified sender email addresses.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/getsenders-1
            endpoint: '/senders',
            params: {
                ...(input.ip !== undefined && { ip: input.ip }),
                ...(input.domain !== undefined && { domain: input.domain })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ProviderSendersResponseSchema.parse(response.data);

        return {
            senders: parsed.senders ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
