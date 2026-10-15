import { z } from 'zod';
import { createAction } from 'nango';

const InvitationInputSchema = z
    .object({
        email: z.string().email().optional().describe('Email address of the person to invite. Provide this or `username`. Example: "teammate@example.com"'),
        username: z
            .string()
            .optional()
            .describe(
                'Mural username of the person to invite. When supplied, the user is added to the mural immediately instead of receiving a pending email invitation.'
            ),
        editPermission: z
            .enum(['view', 'edit'])
            .optional()
            .describe(
                'Permission level granted to the invitee: "view" (read-only) or "edit" (can modify the mural). Defaults to the mural\'s sharing settings when omitted.'
            )
    })
    .describe('A single person to invite to the mural, identified by email or username.')
    .refine((invitation) => invitation.email !== undefined || invitation.username !== undefined, {
        message: 'Each invitation must include either an email or a username.'
    });

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural to invite people to. Example: "workspace1234.1606743986126"'),
        invitations: z.array(InvitationInputSchema).min(1).describe('One or more people to invite to the mural.'),
        sendEmail: z
            .boolean()
            .optional()
            .describe(
                'Whether to email the invitations. The provider defaults this to true, which sends a real, unrecallable email; set false to create the invitations without notifying anyone.'
            ),
        message: z.string().optional().describe('Custom message included in the invitation email.')
    })
    .describe('Invite one or more people to a specific mural with a view or edit permission level.');

const ProviderInvitationResultSchema = z.object({
    email: z.string(),
    username: z.string().optional(),
    refCode: z.string().optional(),
    rejected: z.boolean().optional(),
    reason: z.string().optional()
});

const ProviderInviteResponseSchema = z.object({
    value: z.array(ProviderInvitationResultSchema)
});

const OutputSchema = z
    .object({
        invitations: z
            .array(
                z.object({
                    email: z.string().describe('Email address the invitation was sent to.'),
                    username: z.string().optional().describe('Mural username returned when the invitee was added as a member or guest.'),
                    refCode: z.string().optional().describe('Invitation code that identifies the pending invitation.'),
                    rejected: z.boolean().optional().describe('True when the provider rejected this invitation; inspect `reason` for the cause.'),
                    reason: z.string().optional().describe('Reason the invitation was rejected, for example "MEMBERS_ONLY".')
                })
            )
            .describe('Result for each requested invitation, in the same order as the input.')
    })
    .describe('Outcome of the mural invitation request, one entry per invited person.');

/**
 * @tags: [write]
 * @tagReason: Invites people to a mural, granting them view or edit access and optionally sending a real email.
 * @pitfalls: `sendEmail` defaults to true, so omitting it sends a real, unrecallable email; inviting by `username` adds the user immediately while inviting by `email` creates a pending invitation, and a single entry can come back with `rejected: true` while the overall call still succeeds. There is no way to remove an added mural member afterward.
 */
const action = createAction({
    description: 'Invite one or more people (by email) to a specific mural with a view or edit permission level.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.mural.co/public/reference/inviteuserstomural
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/users/invite`,
            data: {
                invitations: input.invitations.map((invitation) => ({
                    ...(invitation.email !== undefined && { email: invitation.email }),
                    ...(invitation.username !== undefined && { username: invitation.username }),
                    ...(invitation.editPermission !== undefined && { editPermission: invitation.editPermission })
                })),
                ...(input.sendEmail !== undefined && { sendEmail: input.sendEmail }),
                ...(input.message !== undefined && { message: input.message })
            },
            // Repeat invites to the same recipient are rejected by the provider (EXISTING_REF_CODE_OR_MEMBER) instead of duplicating, so a small retry count is safe after a lost response.
            retries: 2
        });

        const parsed = ProviderInviteResponseSchema.parse(response.data);

        return {
            invitations: parsed.value.map((invitation) => ({
                email: invitation.email,
                ...(invitation.username !== undefined && { username: invitation.username }),
                ...(invitation.refCode !== undefined && { refCode: invitation.refCode }),
                ...(invitation.rejected !== undefined && { rejected: invitation.rejected }),
                ...(invitation.reason !== undefined && { reason: invitation.reason })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
