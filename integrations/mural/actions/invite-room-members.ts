import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        roomId: z
            .string()
            .regex(/^[1-9]\d*$/)
            .describe('Numeric ID of the room to invite people to, as a string. Example: "1610033618903"'),
        emails: z.array(z.string().email()).min(1).describe('Email addresses of the people to invite to the room.'),
        message: z.string().optional().describe('Custom message included in the invitation email.'),
        sendEmail: z
            .boolean()
            .optional()
            .describe('Whether Mural emails the invitation. Defaults to true; set false to create pending invitations without sending any email.')
    })
    .describe('Input for inviting one or more people, by email, to join a Mural room.');

const InvitationSchema = z
    .object({
        email: z.string().optional().describe('Email address of the invited person, returned when the invitation was made by email.'),
        username: z.string().optional().describe('Username of the invited person, returned when they were added as a member or guest.'),
        refCode: z.string().optional().describe('Reference code of the room invitation.'),
        rejected: z.boolean().optional().describe('True when Mural rejected this invitation.'),
        reason: z.string().optional().describe('Reason code explaining why the invitation was rejected, when applicable.')
    })
    .describe('Result of a single room invitation.');

const OutputSchema = z
    .object({
        invitations: z.array(InvitationSchema).describe('Per-address results of the room invitation request.')
    })
    .describe('Result of the room invitation request.');

const ProviderInvitationSchema = z.object({
    email: z.string().nullish(),
    username: z.string().nullish(),
    refCode: z.string().nullish(),
    rejected: z.boolean().nullish(),
    reason: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderInvitationSchema).optional()
});

/**
 * @tags: [write]
 * @tagReason: Invites people to a room through the provider, creating pending room invitations and optionally emailing the invitees.
 * @pitfalls: With the default sendEmail:true the invitee is emailed and there is no API to cancel a pending invitation, while sendEmail:false invites stay pending and are absent from room member lists until accepted. Room invites have no view/edit permission field, and per-address failures are returned inline via rejected/reason rather than failing the call.
 */
const action = createAction({
    description: 'Invite one or more people (by email) to join a room.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['rooms:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.mural.co/public/reference/inviteuserstoroom
            endpoint: `/api/public/v1/rooms/${encodeURIComponent(input.roomId)}/users/invite`,
            data: {
                invitations: input.emails.map((email) => ({ email })),
                ...(input.message !== undefined && { message: input.message }),
                ...(input.sendEmail !== undefined && { sendEmail: input.sendEmail })
            },
            retries: 0 // eslint-disable-line @nangohq/custom-integrations-linting/proxy-call-retries -- Non-idempotent write: a retry after a lost response could send duplicate invitations/emails.
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const invitations = (parsed.value ?? []).map((invitation) => ({
            ...(invitation.email != null && { email: invitation.email }),
            ...(invitation.username != null && { username: invitation.username }),
            ...(invitation.refCode != null && { refCode: invitation.refCode }),
            ...(invitation.rejected != null && { rejected: invitation.rejected }),
            ...(invitation.reason != null && { reason: invitation.reason })
        }));

        return {
            invitations
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
