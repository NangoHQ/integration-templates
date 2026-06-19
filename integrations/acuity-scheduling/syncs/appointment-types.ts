import { createSync } from 'nango';
import { z } from 'zod';

const AppointmentTypeSchema = z.object({
    id: z.string(),
    active: z.boolean().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    duration: z.number().optional(),
    price: z.string().optional(),
    category: z.string().optional(),
    color: z.string().optional(),
    private: z.boolean().optional(),
    type: z.string().optional(),
    classSize: z.number().nullable().optional(),
    paddingAfter: z.number().optional(),
    paddingBefore: z.number().optional(),
    calendarIDs: z.array(z.number()).optional()
});

const ProviderAppointmentTypeSchema = z.object({
    id: z.number(),
    active: z.boolean().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    duration: z.number().optional(),
    price: z.string().optional(),
    category: z.string().optional(),
    color: z.string().optional(),
    private: z.boolean().optional(),
    type: z.string().optional(),
    classSize: z.number().nullable().optional(),
    paddingAfter: z.number().optional(),
    paddingBefore: z.number().optional(),
    calendarIDs: z.array(z.number()).optional()
});

const ProviderResponseSchema = z.array(ProviderAppointmentTypeSchema);

const sync = createSync({
    description: 'Sync appointment types.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        AppointmentType: AppointmentTypeSchema
    },

    exec: async (nango) => {
        // https://developers.acuityscheduling.com/reference/appointment-types
        const response = await nango.get({
            endpoint: '/appointment-types',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse appointment types: ${parsed.error.message}`);
        }

        const appointmentTypes = parsed.data.map((item) => ({
            id: String(item.id),
            ...(item.active !== undefined && { active: item.active }),
            ...(item.name !== undefined && { name: item.name }),
            ...(item.description !== undefined && { description: item.description }),
            ...(item.duration !== undefined && { duration: item.duration }),
            ...(item.price !== undefined && { price: item.price }),
            ...(item.category !== undefined && { category: item.category }),
            ...(item.color !== undefined && { color: item.color }),
            ...(item.private !== undefined && { private: item.private }),
            ...(item.type !== undefined && { type: item.type }),
            ...(item.classSize !== null && item.classSize !== undefined && { classSize: item.classSize }),
            ...(item.paddingAfter !== undefined && { paddingAfter: item.paddingAfter }),
            ...(item.paddingBefore !== undefined && { paddingBefore: item.paddingBefore }),
            ...(item.calendarIDs !== undefined && { calendarIDs: item.calendarIDs })
        }));

        await nango.trackDeletesStart('AppointmentType');
        if (appointmentTypes.length > 0) {
            await nango.batchSave(appointmentTypes, 'AppointmentType');
        }
        await nango.trackDeletesEnd('AppointmentType');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
