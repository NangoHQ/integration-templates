import { z } from 'zod';
import { createAction } from 'nango';

const InviteActionSchema = z.enum(['SCHEDULE', 'DESCHEDULE', 'SEND_NOW']);

const UserStatusSchema = z.enum(['INVITE_EXPIRED', 'INVITE_PENDING', 'USER_ACTIVE', 'USER_DRAFT', 'USER_INACTIVE', 'USER_ONBOARDING', 'USER_SUSPENDED']);

const InputSchema = z
    .object({
        user_id: z.string().describe('Unique identifier of the user whose invite lifecycle to manage. Example: "bde8334e-042e-4f39-9a5d-355ae17342e6"'),
        action: InviteActionSchema.describe(
            'Invite action to apply. SCHEDULE creates or updates a scheduled invitation at invitation_time, DESCHEDULE cancels any pending scheduled invitation, SEND_NOW immediately sends the invite email.'
        ),
        invitation_time: z
            .string()
            .optional()
            .describe(
                'ISO 8601 datetime with a timezone offset at which to invite the user, e.g. "2027-01-01T12:00:00+00:00". Required when action is SCHEDULE and ignored otherwise.'
            )
    })
    .describe('Input for managing a Ramp user invite lifecycle.');

const ProviderUserSchema = z.object({
    id: z.string(),
    status: UserStatusSchema,
    scheduled_invitation_date: z.string().nullable()
});

const OutputSchema = z
    .object({
        user_id: z.string().describe('Unique identifier of the user whose invite lifecycle was managed.'),
        action: InviteActionSchema.describe('The invite action that was applied.'),
        status: UserStatusSchema.optional().describe(
            'The user status observed immediately after the invite action was applied. Omitted when the follow-up read failed (see readback_error).'
        ),
        scheduled_invitation_date: z
            .string()
            .optional()
            .describe('ISO 8601 datetime at which the user is scheduled to be invited. Omitted when no invitation is scheduled or the follow-up read failed.'),
        readback_error: z
            .string()
            .optional()
            .describe(
                'Set when the invite action succeeded but reading the user back afterwards failed; the action was still applied, so do not retry it (SEND_NOW would send a duplicate email).'
            )
    })
    .describe("Result of applying an invite action, including the user's status and pending scheduled invitation date.");

/**
 * @tags: [write, destructive]
 * @tagReason: Applies a provider-side invite action (schedule, cancel, or immediately send) that mutates user state and sends an invite email, effects that are not easily reversed.
 * @pitfalls: SEND_NOW sends a real invite email that cannot be recalled, and DESCHEDULE silently does nothing when no invitation is scheduled. SCHEDULE and SEND_NOW require the user to be in DRAFT status, and invitation_time is required for SCHEDULE and must be an ISO 8601 datetime with a timezone offset. If the follow-up user read fails after the invite action succeeded, the action still returns (with readback_error set and status omitted) instead of failing, so do not retry it.
 */
const action = createAction({
    description: "Schedule, reschedule, deschedule, or immediately send a user's pending invite.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read', 'users:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.action === 'SCHEDULE' && input.invitation_time === undefined) {
            throw new nango.ActionError({
                type: 'missing_invitation_time',
                message: 'invitation_time is required when action is SCHEDULE.'
            });
        }

        await nango.post({
            // https://docs.ramp.com/openapi/developer-api.json - POST /developer/v1/users/{user_id}/invite
            endpoint: `/developer/v1/users/${encodeURIComponent(input.user_id)}/invite`,
            data: {
                action: input.action,
                ...(input.invitation_time !== undefined && { invitation_time: input.invitation_time })
            },
            // Non-idempotent write: a retried SEND_NOW could send a duplicate invite email, so no automatic retries.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        // @allowTryCatch: The invite POST has already been applied (and SEND_NOW may have emailed the user), so a failed read-back must not fail the action and prompt a duplicate retry.
        try {
            const response = await nango.get({
                // https://docs.ramp.com/openapi/developer-api.json - GET /developer/v1/users/{user_id}
                endpoint: `/developer/v1/users/${encodeURIComponent(input.user_id)}`,
                retries: 3
            });

            const parsed = ProviderUserSchema.safeParse(response.data);
            if (!parsed.success) {
                return {
                    user_id: input.user_id,
                    action: input.action,
                    readback_error: `Invite action applied, but the user read-back returned an unexpected shape: ${parsed.error.message}`
                };
            }

            return {
                user_id: parsed.data.id,
                action: input.action,
                status: parsed.data.status,
                ...(parsed.data.scheduled_invitation_date != null && { scheduled_invitation_date: parsed.data.scheduled_invitation_date })
            };
        } catch (error) {
            return {
                user_id: input.user_id,
                action: input.action,
                readback_error: `Invite action applied, but reading the user back failed: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
