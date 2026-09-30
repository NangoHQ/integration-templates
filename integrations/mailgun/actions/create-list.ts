import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        address: z
            .string()
            .describe(
                'Email address of the mailing list to create. The domain must already exist in the Mailgun account. Example: "announcements@sandbox123.mailgun.org"'
            ),
        name: z.string().optional().describe('Human-readable name of the mailing list. Example: "Product announcements"'),
        description: z.string().optional().describe('Description of the mailing list.'),
        access_level: z
            .enum(['readonly', 'members', 'everyone'])
            .optional()
            .describe('Who can post to the list: "readonly" (only the account, the Mailgun default), "members" (list members), or "everyone".'),
        reply_preference: z
            .enum(['list', 'sender'])
            .optional()
            .describe('Where replies to list messages go: "list" (the whole list) or "sender" (the original author). Omit to use the Mailgun default.')
    })
    .describe('Input for creating a Mailgun mailing list');

const OutputSchema = z
    .object({
        address: z.string().describe('Email address of the created mailing list.'),
        name: z.string().optional().describe('Human-readable name of the created mailing list.'),
        description: z.string().optional().describe('Description of the created mailing list.'),
        access_level: z.string().optional().describe('Access level of the created list: "readonly", "members", or "everyone".'),
        reply_preference: z.string().optional().describe('Reply preference of the created list: "list" or "sender". Omitted when Mailgun returns no value.'),
        members_count: z.number().optional().describe('Number of members subscribed to the list after creation.'),
        created_at: z.string().optional().describe('Timestamp when the list was created. Example: "Wed, 30 Sep 2026 14:22:44 -0000"')
    })
    .describe('The created Mailgun mailing list');

const MailgunListSchema = z.object({
    address: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    access_level: z.string().optional(),
    reply_preference: z.string().nullable().optional(),
    members_count: z.number().optional(),
    created_at: z.string().optional()
});

const CreateListResponseSchema = z.object({
    list: MailgunListSchema,
    message: z.string().optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new mailing list on the provider.
 * @pitfalls: Omitting access_level creates a readonly list; pass members or everyone to allow posting or self-management. The address domain must already exist in the Mailgun account, and reusing an address that already belongs to a list fails instead of updating that list. The list is created only in the connection's region (US and EU are separate data stores).
 */
const action = createAction({
    description: 'Create a new mailing list',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Mailgun accepts these parameters on the query string of the POST; sending them in a request
        // body through the Nango proxy fails, so params are used instead of data.
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Lists/
            endpoint: '/v3/lists',
            params: {
                address: input.address,
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.access_level !== undefined && { access_level: input.access_level }),
                ...(input.reply_preference !== undefined && { reply_preference: input.reply_preference })
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- No retries: creating a list has no idempotency key, so a retry after a lost response would repeat the mutation.
            retries: 0
        };

        const response = await nango.post(config);

        const parsed = CreateListResponseSchema.parse(response.data);
        const list = parsed.list;

        return {
            address: list.address,
            ...(list.name !== undefined && { name: list.name }),
            ...(list.description !== undefined && { description: list.description }),
            ...(list.access_level !== undefined && { access_level: list.access_level }),
            ...(list.reply_preference != null && { reply_preference: list.reply_preference }),
            ...(list.members_count !== undefined && { members_count: list.members_count }),
            ...(list.created_at !== undefined && { created_at: list.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
