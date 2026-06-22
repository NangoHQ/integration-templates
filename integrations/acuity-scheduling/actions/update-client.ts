import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    firstName: z.string().describe('Client first name. Example: "Bob"'),
    lastName: z.string().describe('Client last name. Example: "McTest"'),
    phone: z.string().optional().describe('Client phone number. Example: "(123) 555-0102"'),
    email: z.string().optional().describe('Client email. Example: "bob@example.com"'),
    notes: z.string().optional().describe('Client notes.')
});

const ProviderClientSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().optional(),
    notes: z.string().optional()
});

const OutputSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().optional(),
    notes: z.string().optional()
});

const action = createAction({
    description: 'Update a client.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.acuityscheduling.com/reference/put-clients
            endpoint: '/clients',
            params: {
                firstName: input.firstName,
                lastName: input.lastName,
                ...(input.phone !== undefined && { phone: input.phone })
            },
            data: {
                firstName: input.firstName,
                lastName: input.lastName,
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.notes !== undefined && { notes: input.notes })
            },
            retries: 3
        });

        const providerClient = ProviderClientSchema.parse(response.data);

        return {
            firstName: providerClient.firstName,
            lastName: providerClient.lastName,
            ...(providerClient.phone !== undefined && { phone: providerClient.phone }),
            ...(providerClient.notes !== undefined && { notes: providerClient.notes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
