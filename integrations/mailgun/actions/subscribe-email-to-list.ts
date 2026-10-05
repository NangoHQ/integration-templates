import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        list_address: z
            .string()
            .describe(
                'Email address of the mailing list to subscribe to, e.g. "newsletter@mg.example.com". The list is created automatically if it does not exist yet.'
            ),
        list_name: z
            .string()
            .optional()
            .describe('Name for the mailing list, used only when this call creates it. Defaults to the part of list_address before the "@".'),
        access_level: z
            .enum(['readonly', 'members', 'everyone'])
            .optional()
            .describe(
                'Access level for the mailing list, used only when this call creates it. Defaults to "members" instead of Mailgun\'s own "readonly" default. Ignored when the list already exists.'
            ),
        member_address: z.string().describe('Email address of the member to add to the list, e.g. "jane@example.com".'),
        member_name: z.string().optional().describe('Display name of the member.'),
        member_vars: z.record(z.string(), z.unknown()).optional().describe('Arbitrary JSON key/value data to store on the member, e.g. {"plan": "pro"}.')
    })
    .describe('Input for subscribing an email address to a Mailgun mailing list, creating the list first when it does not exist.');

const ProviderMemberSchema = z.object({
    address: z.string(),
    name: z.string().nullable().optional(),
    vars: z.record(z.string(), z.unknown()).nullable().optional(),
    subscribed: z.boolean().optional()
});

const AddMemberResponseSchema = z.object({
    member: ProviderMemberSchema,
    message: z.string().optional()
});

const HttpErrorSchema = z.object({
    response: z.object({
        status: z.number()
    })
});

const MemberOutputSchema = z.object({
    address: z.string().describe('Email address of the member.'),
    name: z.string().optional().describe('Display name of the member.'),
    vars: z.record(z.string(), z.unknown()).optional().describe('Arbitrary JSON key/value data stored on the member.'),
    subscribed: z.boolean().optional().describe('Whether the member is subscribed to the list.')
});

const OutputSchema = z
    .object({
        list_created: z.boolean().describe('True when this call created the mailing list because it did not exist yet; false when the list already existed.'),
        member: MemberOutputSchema.describe('The resulting mailing list member after the upsert.')
    })
    .describe('Result of subscribing the email address: whether the list was created by this call, plus the final member.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the mailing list to check it exists, then creates it when missing and adds or updates the member.
 * @pitfalls: Auto-created lists default to access_level "members" instead of Mailgun's own "readonly" default; list_name and access_level are ignored when the list already exists, and subscribing an address that is already on the list updates that member instead of returning a duplicate error.
 */
const action = createAction({
    description: 'Add a member to a mailing list, automatically creating the list first if it does not exist yet.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let listCreated = false;

        // @allowTryCatch: a 404 from the existence check is an expected branch that triggers list creation; every other error is rethrown unchanged.
        try {
            const getConfig: ProxyConfiguration = {
                // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/mailing-lists/get-v3-lists-address.md
                endpoint: `/v3/lists/${encodeURIComponent(input.list_address)}`,
                retries: 3
            };
            const existing = await nango.get(getConfig);
            // Recorded test mocks resolve instead of throwing on error statuses, so also branch on the response status.
            listCreated = existing.status === 404;
        } catch (err) {
            if (!isHttpErrorWithStatus(err, 404)) {
                throw err;
            }
            listCreated = true;
        }

        if (listCreated) {
            const createConfig: ProxyConfiguration = {
                // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/mailing-lists/post-v3-lists.md
                endpoint: '/v3/lists',
                // Mailgun parses these endpoints' fields from the query string, so parameters are sent as query params rather than a request body.
                params: {
                    address: input.list_address,
                    name: input.list_name ?? deriveListName(input.list_address),
                    access_level: input.access_level ?? 'members'
                },
                // Retries disabled: creating a list is not idempotent and a retry after a lost response would fail as a duplicate.
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                retries: 0
            };
            await nango.post(createConfig);
        }

        const memberConfig: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/mailing-lists/post-lists-string:list_address-members.md
            endpoint: `/v3/lists/${encodeURIComponent(input.list_address)}/members`,
            // Sent as query params rather than a body; Mailgun parses these endpoints' fields from the query string.
            params: {
                address: input.member_address,
                ...(input.member_name !== undefined && { name: input.member_name }),
                ...(input.member_vars !== undefined && { vars: JSON.stringify(input.member_vars) }),
                subscribed: 'yes',
                upsert: 'yes'
            },
            // upsert=yes makes this write idempotent: a retry converges to the same member state instead of erroring on a duplicate.
            retries: 3
        };
        const memberResponse = await nango.post(memberConfig);
        const parsed = AddMemberResponseSchema.parse(memberResponse.data);

        return {
            list_created: listCreated,
            member: {
                address: parsed.member.address,
                ...(parsed.member.name != null && { name: parsed.member.name }),
                ...(parsed.member.vars != null && { vars: parsed.member.vars }),
                ...(parsed.member.subscribed !== undefined && { subscribed: parsed.member.subscribed })
            }
        };
    }
});

function deriveListName(listAddress: string): string {
    const atIndex = listAddress.indexOf('@');
    return atIndex > 0 ? listAddress.slice(0, atIndex) : listAddress;
}

function isHttpErrorWithStatus(err: unknown, status: number): boolean {
    const parsed = HttpErrorSchema.safeParse(err);
    return parsed.success && parsed.data.response.status === status;
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
