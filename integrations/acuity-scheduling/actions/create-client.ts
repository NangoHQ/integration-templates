import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    firstName: z.string().describe('Client first name. Example: "Jane"'),
    lastName: z.string().describe('Client last name. Example: "Doe"'),
    phone: z.string().optional().describe('Client phone number'),
    email: z.string().optional().describe('Client email'),
    notes: z.string().optional().describe('Client notes')
});

const ProviderClientSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    notes: z.string().optional()
});

const OutputSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    notes: z.string().optional()
});

const action = createAction({
    description: 'Create a client.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-client',
        group: 'Clients'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.acuityscheduling.com/reference/post-clients
            endpoint: '/clients',
            data: {
                firstName: input.firstName,
                lastName: input.lastName,
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.notes !== undefined && { notes: input.notes })
            },
            retries: 1
        };

        const response = await nango.post(config);

        const providerClient = ProviderClientSchema.parse(response.data);

        return {
            firstName: providerClient.firstName,
            lastName: providerClient.lastName,
            ...(providerClient.phone !== undefined && { phone: providerClient.phone }),
            ...(providerClient.email !== undefined && { email: providerClient.email }),
            ...(providerClient.notes !== undefined && { notes: providerClient.notes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
