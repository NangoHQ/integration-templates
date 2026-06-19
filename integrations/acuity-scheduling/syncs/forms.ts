import { createSync } from 'nango';
import { z } from 'zod';

const FormFieldSchema = z.object({
    id: z.number(),
    name: z.string(),
    required: z.boolean().optional(),
    type: z.string().optional(),
    options: z.array(z.string()).optional().nullable()
});

const ProviderFormSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional().nullable(),
    hidden: z.boolean().optional().nullable(),
    appointmentTypeIDs: z.array(z.number()).optional().nullable(),
    fields: z.array(FormFieldSchema).optional().nullable()
});

const FormSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    hidden: z.boolean().optional(),
    appointmentTypeIDs: z.array(z.number()).optional(),
    fields: z.array(FormFieldSchema).optional()
});

const sync = createSync({
    description: 'Sync intake forms',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Form: FormSchema
    },

    exec: async (nango) => {
        // Blocker: the Acuity /forms endpoint does not expose updated/modified timestamp
        // filters, cursors, page tokens, or pagination parameters. It returns a complete
        // snapshot of all intake forms on every request.

        // https://developers.acuityscheduling.com/reference/forms
        const response = await nango.get({
            endpoint: '/forms',
            retries: 3
        });

        const parsed = z.array(ProviderFormSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse forms response: ${parsed.error.message}`);
        }

        await nango.trackDeletesStart('Form');

        const forms = parsed.data.map((record) => ({
            id: String(record.id),
            name: record.name,
            ...(record.description != null && { description: record.description }),
            ...(record.hidden != null && { hidden: record.hidden }),
            ...(record.appointmentTypeIDs != null && { appointmentTypeIDs: record.appointmentTypeIDs }),
            ...(record.fields != null && { fields: record.fields })
        }));

        if (forms.length > 0) {
            await nango.batchSave(forms, 'Form');
        }

        await nango.trackDeletesEnd('Form');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
