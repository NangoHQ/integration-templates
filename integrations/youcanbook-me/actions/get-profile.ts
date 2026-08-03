import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    profileId: z.string().min(1).describe('The ID of the booking-page profile. Example: "f4f38519-6e5c-45f2-9897-555960aae524"')
});

const QuestionSchema = z
    .object({
        code: z.string().describe('Field identifier referenced by booking answers. Example: "FNAME"'),
        before: z.string().optional().describe('Label shown before the field.'),
        after: z.string().optional().describe('Label shown after the field.'),
        required: z.boolean().optional().describe('Whether the field is mandatory.'),
        options: z.array(z.string()).optional().describe('Selectable options for choice-based fields.'),
        validation: z.string().optional().describe('Validation rules for the field (e.g. "EMAILS").'),
        validationMessage: z.string().optional().describe('Message shown when validation fails.')
    })
    .passthrough();

const TeamMemberSchema = z
    .object({
        id: z.string().describe('Team member ID. Example: "tm-123"'),
        name: z.string().describe('Display name.'),
        description: z.string().optional(),
        pic: z.string().optional().describe('Profile picture URL.'),
        email: z.string().optional(),
        calendarId: z.string().optional()
    })
    .passthrough();

const AppointmentTypeSchema = z
    .object({
        id: z.string().describe('Appointment type ID. Example: "at-123"'),
        name: z.string().describe('Display name of the appointment type.'),
        description: z.string().optional(),
        slotLength: z.string().optional().describe('Minutes per slot.'),
        numberOfSlots: z.number().optional().describe('How many contiguous slots are booked.'),
        price: z.number().optional().describe('Price in the profile currency.')
    })
    .passthrough();

const WorkingTimesSchema = z
    .object({
        fixedStart: z.string().optional().describe('Fixed daily start time.'),
        fixedEnd: z.string().optional().describe('Fixed daily end time.'),
        workingDays: z.string().optional().describe('Per-day availability rules.'),
        slotIncrement: z.string().optional().describe('Minutes between bookable slots.'),
        durations: z.string().optional().describe('Allowed appointment durations in minutes.'),
        maxNoticeDays: z.number().optional().describe('Maximum days ahead a booking can be made.'),
        minNotice: z.string().optional().describe('Minimum notice required before a booking.')
    })
    .passthrough();

const PaymentsSchema = z
    .object({
        active: z.boolean().optional().describe('Whether payments are enabled.'),
        currency: z.string().optional(),
        priceType: z.string().optional(),
        partner: z.string().optional().describe('Payment partner, e.g. "STRIPE".'),
        pricePerSlot: z.number().optional()
    })
    .passthrough();

const CancelOrRescheduleSchema = z
    .object({
        allowed: z.boolean().optional().describe('Whether the booker can cancel or reschedule.'),
        limitMinutes: z.number().optional().describe('How many minutes before the appointment changes are allowed.'),
        reasonRequired: z.boolean().optional().describe('Whether a reason must be supplied.')
    })
    .passthrough();

const DisplaySchema = z
    .object({
        theme: z.string().optional(),
        layout: z.string().optional()
    })
    .passthrough();

const ActionSchema = z
    .object({
        id: z.string().describe('Action rule ID. Example: "ar-123"'),
        type: z.string().optional().describe('Action type, e.g. "ZAP" for Zapier/webhook.'),
        anchor: z.string().optional().describe('Trigger point, e.g. "BOOKING_CREATED".'),
        offsetMinutes: z.number().optional().describe('Delay relative to the anchor in minutes.'),
        status: z.string().optional().describe('Execution status.'),
        firedAt: z.string().optional().describe('ISO timestamp of last fire.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string().describe('Profile ID. Example: "f4f38519-6e5c-45f2-9897-555960aae524"'),
        title: z.string().optional().describe('Profile display name.'),
        subdomain: z.string().optional().describe('Unique URL slug for the profile.'),
        status: z.string().optional().describe('online or offline.'),
        timeZone: z.string().optional(),
        description: z.string().optional(),
        questions: z.array(QuestionSchema).optional().describe('Intake form field definitions.'),
        teamMembers: z
            .object({
                items: z.array(TeamMemberSchema).optional()
            })
            .passthrough()
            .optional(),
        appointmentTypes: z
            .object({
                items: z.array(AppointmentTypeSchema).optional()
            })
            .passthrough()
            .optional(),
        workingTimes: WorkingTimesSchema.optional(),
        payments: PaymentsSchema.optional(),
        cancelOrReschedule: CancelOrRescheduleSchema.optional(),
        display: DisplaySchema.optional(),
        actions: z.array(ActionSchema).optional().describe('Automated reminder/notification rules.')
    })
    .passthrough();

const action = createAction({
    description:
        'Get full configuration for a single booking-page profile — intake form questions, team members, appointment types, working hours, payments, cancellation policy, and automated actions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://ycbm.stoplight.io/docs/youcanbookme-api/
            endpoint: `/v1/profiles/${encodeURIComponent(input.profileId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Profile not found',
                profileId: input.profileId
            });
        }

        const profile = OutputSchema.parse(response.data);
        return profile;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
