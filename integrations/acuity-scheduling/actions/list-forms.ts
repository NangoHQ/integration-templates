import { z } from 'zod';
import { createAction } from 'nango';

const FormFieldSchema = z.object({
    id: z.number(),
    name: z.string(),
    required: z.boolean(),
    type: z.string(),
    options: z.array(z.string()).optional()
});

const FormSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    hidden: z.boolean(),
    appointmentTypeIDs: z.array(z.number()),
    fields: z.array(FormFieldSchema)
});

const InputSchema = z.object({});

const OutputSchema = z.array(FormSchema);

const action = createAction({
    description: 'List intake forms.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.acuityscheduling.com/reference/forms
            endpoint: '/forms',
            retries: 3
        });

        const rawData = response.data;
        if (!Array.isArray(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of forms from the provider.'
            });
        }

        const forms = rawData.map((item) => FormSchema.parse(item));
        return forms;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
