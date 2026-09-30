import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const inputSchema = z
    .object({
        list_address: z.string().describe('Email address of the mailing list to add the member to. Example: "developers@mg.example.com"'),
        address: z.string().describe('Email address of the member to add to the mailing list. Example: "jane.doe@example.com"'),
        name: z.string().optional().describe('Display name of the member. Example: "Jane Doe"'),
        vars: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Custom variables to attach to the member. Sent to Mailgun as a JSON-encoded string. Example: {"plan": "pro"}'),
        subscribed: z
            .boolean()
            .optional()
            .describe("Whether the member is subscribed to the list. Maps to Mailgun's yes/no flag. Defaults to true when omitted."),
        upsert: z
            .boolean()
            .optional()
            .describe("When true, an existing member with the same address is updated instead of returning an error. Maps to Mailgun's yes/no flag.")
    })
    .describe('Input for adding a member to a Mailgun mailing list.');

const providerMemberSchema = z.object({
    address: z.string(),
    name: z.string().nullable().optional(),
    subscribed: z.boolean().optional(),
    vars: z.record(z.string(), z.unknown()).optional()
});

const providerResponseSchema = z.object({
    member: providerMemberSchema,
    message: z.string().optional()
});

const outputSchema = z
    .object({
        address: z.string().describe('Email address of the added list member.'),
        name: z.string().optional().describe('Display name of the member, when set.'),
        subscribed: z.boolean().optional().describe('Whether the member is subscribed to the list.'),
        vars: z.record(z.string(), z.unknown()).optional().describe('Custom variables attached to the member.'),
        message: z.string().optional().describe('Confirmation message returned by Mailgun.')
    })
    .describe("The added mailing list member and Mailgun's confirmation message.");

/**
 * @tags: [write]
 * @tagReason: Adds a member to a Mailgun mailing list, which mutates provider state.
 * @pitfalls: Adding an address that is already a member fails unless upsert is true. Members are subscribed by default unless subscribed is set to false. The mailing list must already exist.
 */
const action = createAction({
    description: 'Add a member (subscriber) to a Mailgun mailing list.',
    version: '1.0.0',
    input: inputSchema,
    output: outputSchema,

    exec: async (nango, input): Promise<z.infer<typeof outputSchema>> => {
        // Mailgun expects these write parameters as form fields; they are sent as URL query-string params because the
        // Nango proxy does not forward a plain Content-Type header and would otherwise serialize the body as JSON.
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/mailing-lists/post-lists-string:list_address-members
            endpoint: `/v3/lists/${encodeURIComponent(input.list_address)}/members`,
            params: {
                address: input.address,
                ...(input.name !== undefined && { name: input.name }),
                ...(input.vars !== undefined && { vars: JSON.stringify(input.vars) }),
                ...(input.subscribed !== undefined && { subscribed: input.subscribed ? 'yes' : 'no' }),
                ...(input.upsert !== undefined && { upsert: input.upsert ? 'yes' : 'no' })
            },
            // Not idempotent: retrying after a lost response would repeat the create and fail with "already a member" unless upsert is set.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.post(config);

        if (!response.data || !response.data.member) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Mailgun did not return the created mailing list member.',
                list_address: input.list_address,
                address: input.address
            });
        }

        const parsed = providerResponseSchema.parse(response.data);
        const member = parsed.member;

        return {
            address: member.address,
            ...(member.name != null && member.name !== '' && { name: member.name }),
            ...(member.subscribed !== undefined && { subscribed: member.subscribed }),
            ...(member.vars !== undefined && { vars: member.vars }),
            ...(parsed.message !== undefined && { message: parsed.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
