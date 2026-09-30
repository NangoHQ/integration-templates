import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        list_address: z.string().describe('Email address of the mailing list containing the member. Example: "dev@samples.mailgun.org"'),
        member_address: z.string().describe('Email address of the list member to update. Example: "jane.doe@example.com"'),
        name: z.string().optional().describe('New full name for the member. Omit to leave the current name unchanged.'),
        subscribed: z
            .boolean()
            .optional()
            .describe(
                'New subscription status for the member. Unsubscribed members remain on the list but are skipped when mail is sent to it. Omit to leave the current status unchanged.'
            ),
        vars: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Custom variables to store on the member as a JSON object. Example: {"role": "admin"}. Omit to leave the current variables unchanged.')
    })
    .describe(
        'Fields identifying the mailing list member to update and the new values to apply. Only the provided fields are changed; omitted fields keep their current values.'
    );

const ProviderMemberSchema = z.object({
    address: z.string(),
    name: z.string().optional(),
    subscribed: z.boolean(),
    vars: z.record(z.string(), z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    member: ProviderMemberSchema,
    message: z.string().optional()
});

const OutputSchema = z
    .object({
        address: z.string().describe('Email address of the updated member.'),
        name: z.string().optional().describe('Full name of the member. Omitted when the member has no name set.'),
        subscribed: z.boolean().describe('Whether the member is currently subscribed to the mailing list.'),
        vars: z.record(z.string(), z.unknown()).optional().describe('Custom variables stored on the member. Omitted when the member has none.')
    })
    .describe('The mailing list member as stored on the provider after the update was applied.');

/**
 * @tags: [write]
 * @tagReason: Updates a mailing list member's name, subscription status, or custom variables on the provider.
 * @pitfalls: Passing vars replaces the member's entire variables object instead of merging into it - any existing variable keys not included in vars are lost.
 */
const action = createAction({
    description: "Update a mailing list member's subscription status, name, or custom variables.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Mailing-Lists/
            endpoint: `/v3/lists/${encodeURIComponent(input.list_address)}/members/${encodeURIComponent(input.member_address)}`,
            params: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.subscribed !== undefined && { subscribed: input.subscribed ? 'yes' : 'no' }),
                ...(input.vars !== undefined && { vars: JSON.stringify(input.vars) })
            },
            // PUT with absolute values is naturally idempotent: retrying the same update yields the same end state.
            retries: 3
        };

        const response = await nango.put(config);
        const parsed = ProviderResponseSchema.parse(response.data);
        const member = parsed.member;

        return {
            address: member.address,
            ...(member.name != null && member.name !== '' && { name: member.name }),
            subscribed: member.subscribed,
            ...(member.vars != null && Object.keys(member.vars).length > 0 && { vars: member.vars })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
