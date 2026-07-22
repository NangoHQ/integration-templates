import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from: z.string().describe('The start date of the request. Date only, e.g. 2026-09-01'),
    to: z.string().describe('The end date of the request. Date only, e.g. 2026-09-01'),
    leaveTypeId: z.number().describe('The leave type ID for the request. Example: 586853'),
    fromTime: z
        .string()
        .optional()
        .describe(
            "The part of day the leave starts. 'AM' (morning), 'PM' (lunchtime), or minutes since midnight for hourly bookings. Use 'AM' for a full day."
        ),
    toTime: z
        .string()
        .optional()
        .describe(
            "The part of day the leave ends. 'AM' (lunchtime), 'PM' (end of day), or minutes since midnight for hourly bookings. Use 'PM' for a full day."
        ),
    userOrDepartmentId: z.number().optional().describe("The target user or department ID. Always pass the user's own ID, even for admin self-bookings."),
    reason: z.string().optional().describe('An optional reason for the request'),
    bookFor: z
        .enum(['User', 'Department', 'Everyone'])
        .optional()
        .describe('Scope of the booking. Combine with userOrDepartmentId set to a department or org ID for group bookings.'),
    suppressEmails: z.boolean().optional().describe('Admin-only: suppress leave request emails'),
    override: z.boolean().optional().describe('Admin-only: bypass the max-off department limit'),
    bookAsRequestee: z.boolean().optional().describe('Admin-only: submit as a pending request from the target user instead of auto-approving'),
    overrideLockedDays: z.boolean().optional().describe('Admin-only: allow booking over locked dates'),
    overrideAccruedAllowance: z.boolean().optional().describe('Admin-only: bypass accrued allowance requirement')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    response: z.string().nullable().optional(),
    rejections: z.boolean().optional(),
    autoApproved: z.boolean().optional(),
    holidayId: z.number().optional(),
    overrideRequired: z.boolean().optional(),
    overrideLockedDateRequired: z.boolean().optional(),
    overrideAccruedAllowanceRequired: z.boolean().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    response: z.string().optional(),
    rejections: z.boolean().optional(),
    autoApproved: z.boolean().optional(),
    holidayId: z.number().optional(),
    overrideRequired: z.boolean().optional(),
    overrideLockedDateRequired: z.boolean().optional(),
    overrideAccruedAllowanceRequired: z.boolean().optional()
});

const action = createAction({
    description: 'Submit a leave request for a user, department, or the whole organisation',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            from: input.from,
            to: input.to,
            leaveTypeId: input.leaveTypeId,
            ...(input.fromTime !== undefined && { fromTime: input.fromTime }),
            ...(input.toTime !== undefined && { toTime: input.toTime }),
            ...(input.userOrDepartmentId !== undefined && { userOrDepartmentId: input.userOrDepartmentId }),
            ...(input.reason !== undefined && { reason: input.reason }),
            ...(input.bookFor !== undefined && { bookFor: input.bookFor }),
            ...(input.suppressEmails !== undefined && { suppressEmails: input.suppressEmails }),
            ...(input.override !== undefined && { override: input.override }),
            ...(input.bookAsRequestee !== undefined && { bookAsRequestee: input.bookAsRequestee }),
            ...(input.overrideLockedDays !== undefined && { overrideLockedDays: input.overrideLockedDays }),
            ...(input.overrideAccruedAllowance !== undefined && { overrideAccruedAllowance: input.overrideAccruedAllowance })
        };

        const response = await nango.post({
            // https://timetastic.co.uk/api/ (interactive OpenAPI reference)
            // https://help.timetastic.co.uk/en/articles/13193377-timetastic-api
            endpoint: '/holidays',
            data: body,
            retries: 1
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider returned an unexpected response shape',
                details: parsed.error.issues
            });
        }

        const data = parsed.data;

        if (data.success === false && (data.holidayId === 0 || data.holidayId === undefined)) {
            throw new nango.ActionError({
                type: 'booking_failed',
                message: data.response || 'The booking was not created. Ensure fromTime, toTime, and userOrDepartmentId are provided.',
                response: data.response
            });
        }

        return {
            success: data.success,
            ...(data.response != null && { response: data.response }),
            ...(data.rejections !== undefined && { rejections: data.rejections }),
            ...(data.autoApproved !== undefined && { autoApproved: data.autoApproved }),
            ...(data.holidayId !== undefined && { holidayId: data.holidayId }),
            ...(data.overrideRequired !== undefined && { overrideRequired: data.overrideRequired }),
            ...(data.overrideLockedDateRequired !== undefined && { overrideLockedDateRequired: data.overrideLockedDateRequired }),
            ...(data.overrideAccruedAllowanceRequired !== undefined && { overrideAccruedAllowanceRequired: data.overrideAccruedAllowanceRequired })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
