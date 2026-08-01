import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    intentId: z.string().describe('The ID of the booking intent to retrieve. Example: "itt_abc123"')
});

const FormFieldSchema = z.object({
    id: z.string(),
    value: z.string()
});

const SelectionsSchema = z.object({
    appointmentTypeIds: z.array(z.string()).nullable().optional(),
    duration: z.number().nullable().optional(),
    form: z.array(FormFieldSchema).nullable().optional(),
    location: z.string().nullable().optional(),
    smsConsent: z.boolean().nullable().optional(),
    startsAt: z.number().nullable().optional(),
    teamMemberId: z.string().nullable().optional(),
    timeZone: z.string().nullable().optional(),
    units: z.number().nullable().optional()
});

const ProviderIntentSchema = z.object({
    id: z.string(),
    bookingId: z.string().nullable(),
    createdAt: z.number(),
    intentStatus: z.string(),
    selections: SelectionsSchema
});

const OutputSelectionsSchema = z.object({
    appointmentTypeIds: z.array(z.string()).optional(),
    duration: z.number().optional(),
    form: z.array(FormFieldSchema).optional(),
    location: z.string().optional(),
    smsConsent: z.boolean().optional(),
    startsAt: z.number().optional(),
    teamMemberId: z.string().optional(),
    timeZone: z.string().optional(),
    units: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    bookingId: z.string().optional(),
    createdAt: z.number(),
    intentStatus: z.string(),
    selections: OutputSelectionsSchema
});

const normalizeSelections = (selections: z.infer<typeof SelectionsSchema>): z.infer<typeof OutputSelectionsSchema> => {
    return {
        ...(selections.appointmentTypeIds != null && { appointmentTypeIds: selections.appointmentTypeIds }),
        ...(selections.duration != null && { duration: selections.duration }),
        ...(selections.form != null && { form: selections.form }),
        ...(selections.location != null && { location: selections.location }),
        ...(selections.smsConsent != null && { smsConsent: selections.smsConsent }),
        ...(selections.startsAt != null && { startsAt: selections.startsAt }),
        ...(selections.teamMemberId != null && { teamMemberId: selections.teamMemberId }),
        ...(selections.timeZone != null && { timeZone: selections.timeZone }),
        ...(selections.units != null && { units: selections.units })
    };
};

const action = createAction({
    description: 'Get the current state of a booking intent (selections made so far, status, resulting bookingId once confirmed).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://forum.youcanbook.me/t/fetch-user-calendar-slots-availability-via-api/2797
            endpoint: `/v1/intents/${encodeURIComponent(input.intentId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Booking intent not found',
                intentId: input.intentId
            });
        }

        const providerIntent = ProviderIntentSchema.parse(response.data);

        return {
            id: providerIntent.id,
            createdAt: providerIntent.createdAt,
            intentStatus: providerIntent.intentStatus,
            selections: normalizeSelections(providerIntent.selections),
            ...(providerIntent.bookingId != null && { bookingId: providerIntent.bookingId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
