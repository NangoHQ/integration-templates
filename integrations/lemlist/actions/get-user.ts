import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        userId: z
            .string()
            .describe(
                'The unique identifier of the user, e.g. a `usr_...` id from the team\'s `userIds` array or a campaign\'s `createdBy`. Example: "usr_eSrHPSoL9QVPUOsho".'
            )
    })
    .describe('Input for fetching a single lemlist team member by user ID.');

const LinkedInSchema = z
    .object({
        linkedinUrl: z.string().optional().describe('The LinkedIn profile URL of the user. Only present when LinkedIn is connected.'),
        status: z.boolean().optional().describe('Whether LinkedIn is connected for this user.'),
        followLimit: z.number().optional().describe('Daily limit for LinkedIn follow requests.'),
        inviteLimit: z.number().optional().describe('Daily limit for LinkedIn connection invites.'),
        sendLimit: z.number().optional().describe('Daily limit for LinkedIn messages.'),
        visitLimit: z.number().optional().describe('Daily limit for LinkedIn profile visits.')
    })
    .describe('LinkedIn integration settings for the user.');

const MailboxSchema = z
    .object({
        _id: z.string().optional().describe('Unique mailbox identifier. Example: "usm_2mkqJNUjnJQiyVBht".'),
        email: z.string().optional().describe('Mailbox email address.'),
        provider: z.string().optional().describe('Email provider of the mailbox (e.g. google, microsoft).'),
        status: z.string().optional().describe('Connection status of the mailbox (CONNECTED, ERROR, or DISCONNECTED).'),
        lemlist: z
            .object({
                emailLimit: z.number().optional().describe('Daily email send limit for this mailbox.')
            })
            .optional()
            .describe('Lemlist sending settings for this mailbox.'),
        lemwarm: z
            .object({
                active: z.boolean().optional().describe('Whether lemwarm warm-up is active for this mailbox.')
            })
            .optional()
            .describe('Lemwarm (deliverability warm-up) settings for this mailbox.')
    })
    .describe('An email mailbox connected to the user for sending campaigns.');

const OutputSchema = z
    .object({
        _id: z.string().describe('Unique user identifier. Example: "usr_eSrHPSoL9QVPUOsho".'),
        email: z.string().describe("The user's email address."),
        role: z.string().describe("The user's role in the team (e.g. admin, member)."),
        linkedIn: LinkedInSchema.optional(),
        mailboxes: z.array(MailboxSchema).describe('Email mailboxes connected to this user. Empty when the user has no connected mailboxes.')
    })
    .describe('A lemlist user (team member) with their connected sending channels.');

/**
 * @tags: [read]
 * @tagReason: Only fetches a user's information from the provider; performs no mutations.
 * @pitfalls: The linkedIn object is present even when the user has never connected LinkedIn (with status false and no linkedinUrl), so check linkedIn.status rather than the object's presence to determine connection state.
 */
const action = createAction({
    description: "Get a single team member/user's info by user ID.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.lemlist.com/api-reference/endpoints/users/get-user
            endpoint: `/api/users/${encodeURIComponent(input.userId)}`,
            retries: 3
        };

        const response = await nango.get(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
