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
        status: UserStatusSchema.describe('The user status observed immediately after the invite action was applied.'),
        scheduled_invitation_date: z
            .string()
            .nullable()
            .describe('ISO 8601 datetime at which the user is scheduled to be invited, or null when no invitation is scheduled.')
    })
    .describe("Result of applying an invite action, including the user's status and pending scheduled invitation date.");

/**
 * @tags: [write, destructive]
 * @tagReason: Applies a provider-side invite action (schedule, cancel, or immediately send) that mutates user state and sends an invite email, effects that are not easily reversed.
 * @pitfalls: SEND_NOW sends a real invite email that cannot be recalled, and DESCHEDULE silently does nothing when no invitation is scheduled. SCHEDULE and SEND_NOW require the user to be in DRAFT status, and invitation_time is required for SCHEDULE and must be an ISO 8601 datetime with a timezone offset.
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
            // https://docs.ramp.com/developer-api/v1/overview/introduction
            endpoint: `/developer/v1/users/${encodeURIComponent(input.user_id)}/invite`,
            data: {
                action: input.action,
                ...(input.invitation_time !== undefined && { invitation_time: input.invitation_time })
            },
            // Non-idempotent write: a retried SEND_NOW could send a duplicate invite email, so no automatic retries.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/overview/introduction
            endpoint: `/developer/v1/users/${encodeURIComponent(input.user_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found after applying the invite action.',
                user_id: input.user_id
            });
        }

        const user = ProviderUserSchema.parse(response.data);

        return {
            user_id: user.id,
            action: input.action,
            status: user.status,
            scheduled_invitation_date: user.scheduled_invitation_date
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
