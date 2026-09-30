import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        list_address: z.string().describe('Email address of the mailing list that contains the member. Example: "qa_list@example.com"'),
        member_address: z.string().describe('Email address of the mailing list member to retrieve. Example: "daniel@test.com"')
    })
    .describe('Identifies the mailing list and the member to retrieve, both by email address.');

const MemberVarsSchema = z.record(z.string(), z.unknown());

const MemberSchema = z.object({
    address: z.string(),
    name: z.string().optional(),
    subscribed: z.boolean().optional(),
    vars: MemberVarsSchema.optional()
});

const ProviderResponseSchema = z.object({
    member: MemberSchema
});

const OutputSchema = z
    .object({
        address: z.string().describe('Email address of the mailing list member.'),
        name: z.string().optional().describe('Display name of the member. Empty string when the member was added without a name.'),
        subscribed: z.boolean().optional().describe('Whether the member is subscribed to the mailing list.'),
        vars: MemberVarsSchema.optional().describe('Custom JSON variables stored on the member, keyed by variable name.')
    })
    .describe('A single mailing list member.');

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET to fetch one mailing list member and does not modify any Mailgun resource.
 */
const action = createAction({
    description: 'Retrieve a single mailing list member by email.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/ (GET /v3/lists/{list_address}/members/{member_address})
            endpoint: `/v3/lists/${encodeURIComponent(input.list_address)}/members/${encodeURIComponent(input.member_address)}`,
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.parse(response.data);
        const member = parsed.member;

        return {
            address: member.address,
            ...(member.name !== undefined && { name: member.name }),
            ...(member.subscribed !== undefined && { subscribed: member.subscribed }),
            ...(member.vars !== undefined && { vars: member.vars })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
