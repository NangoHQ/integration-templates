import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    firstName: z.string().describe('Client first name. Example: "Bob"'),
    lastName: z.string().describe('Client last name. Example: "McTest"'),
    phone: z.string().optional().describe('Client phone number. Example: "(123) 555-0102"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a client.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api-v1'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developers.acuityscheduling.com/reference/delete-clients
            endpoint: '/clients',
            params: {
                firstName: input.firstName,
                lastName: input.lastName,
                ...(input.phone !== undefined && { phone: input.phone })
            },
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
