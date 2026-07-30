import { z } from 'zod';
import { createAction } from 'nango';

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
    bookingId: z.string().nullable().optional(),
    createdAt: z.number(),
    id: z.string(),
    intentStatus: z.string(),
    selections: SelectionsSchema
});

const InputSchema = z.object({
    intentId: z.string().describe('Booking intent ID. Example: "itt_xxx"'),
    startsAt: z.number().optional().describe('Chosen time slot as epoch milliseconds'),
    form: z.array(FormFieldSchema).optional().describe('Contact form fields (e.g. FNAME, LNAME, EMAIL)'),
    timeZone: z.string().optional().describe('IANA timezone or "UTC"'),
    teamMemberId: z.string().optional(),
    appointmentTypeIds: z.array(z.string()).optional(),
    duration: z.number().optional(),
    units: z.number().optional(),
    location: z.string().optional()
});

const OutputSchema = z.object({
    bookingId: z.string().optional(),
    createdAt: z.number(),
    id: z.string(),
    intentStatus: z.string(),
    selections: z.object({
        appointmentTypeIds: z.array(z.string()).optional(),
        duration: z.number().optional(),
        form: z.array(FormFieldSchema).optional(),
        location: z.string().optional(),
        smsConsent: z.boolean().optional(),
        startsAt: z.number().optional(),
        teamMemberId: z.string().optional(),
        timeZone: z.string().optional(),
        units: z.number().optional()
    })
});

function normalizeSelections(selections: z.infer<typeof SelectionsSchema>) {
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
}

const action = createAction({
    description: 'Set the chosen time slot, contact/form details, timezone, and other booking options on an in-progress intent',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://api.youcanbook.me/docs/index.html
            endpoint: `/v1/intents/${encodeURIComponent(input.intentId)}/selections`,
            data: {
                ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
                ...(input.form !== undefined && { form: input.form }),
                ...(input.timeZone !== undefined && { timeZone: input.timeZone }),
                ...(input.teamMemberId !== undefined && { teamMemberId: input.teamMemberId }),
                ...(input.appointmentTypeIds !== undefined && { appointmentTypeIds: input.appointmentTypeIds }),
                ...(input.duration !== undefined && { duration: input.duration }),
                ...(input.units !== undefined && { units: input.units }),
                ...(input.location !== undefined && { location: input.location })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an empty response'
            });
        }

        const providerIntent = ProviderIntentSchema.parse(response.data);

        return {
            id: providerIntent.id,
            createdAt: providerIntent.createdAt,
            intentStatus: providerIntent.intentStatus,
            ...(providerIntent.bookingId != null && { bookingId: providerIntent.bookingId }),
            selections: normalizeSelections(providerIntent.selections)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
