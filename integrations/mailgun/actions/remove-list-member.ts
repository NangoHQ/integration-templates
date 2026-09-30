import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        list_address: z.string().describe('Email address of the mailing list the member belongs to. Example: "newsletter@mg.example.com".'),
        member_address: z.string().describe('Email address of the member to remove from the mailing list. Example: "jane.doe@example.com".')
    })
    .describe('Input for removing a member from a Mailgun mailing list.');

const ProviderDeleteMemberResponseSchema = z.object({
    member: z.object({
        address: z.string()
    }),
    message: z.string()
});

const OutputSchema = z
    .object({
        address: z.string().describe('Email address of the member that was removed from the mailing list.'),
        message: z.string().describe('Confirmation message returned by Mailgun. Example: "Mailing list member has been deleted".')
    })
    .describe('Result of removing a member from a Mailgun mailing list.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes a member from a mailing list on the provider.
 * @pitfalls: Removing a member who is not on the list fails with a 404 error instead of succeeding silently.
 */
const action = createAction({
    description: 'Remove a member from a mailing list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/ - DELETE /v3/lists/{list_address}/members/{member_address}
            endpoint: `/v3/lists/${encodeURIComponent(input.list_address)}/members/${encodeURIComponent(input.member_address)}`,
            retries: 3
        };
        const response = await nango.delete(config);

        const parsed = ProviderDeleteMemberResponseSchema.parse(response.data);

        return {
            address: parsed.member.address,
            message: parsed.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
