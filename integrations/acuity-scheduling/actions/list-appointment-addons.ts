import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderAddonSchema = z.object({
    id: z.number(),
    name: z.string(),
    duration: z.number(),
    price: z.string(),
    private: z.boolean()
});

const OutputSchema = z.object({
    addons: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            duration: z.number(),
            price: z.string(),
            private: z.boolean()
        })
    )
});

const action = createAction({
    description: 'List available add-ons for appointment types.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-appointment-addons',
        group: 'Appointments'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.acuityscheduling.com/reference/appointments-addons
        const response = await nango.get({
            endpoint: '/appointment-addons',
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of add-ons from the provider.'
            });
        }

        const addons = response.data.map((item: unknown) => {
            const parsed = ProviderAddonSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Provider returned an add-on with unexpected shape.',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        return { addons };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
