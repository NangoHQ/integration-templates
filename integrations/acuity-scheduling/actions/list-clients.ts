import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    search: z.string().optional().describe('Search filter by first name, last name, or phone.')
});

const ProviderClientSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    notes: z.string().optional()
});

const OutputSchema = z.object({
    clients: z.array(
        z.object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional(),
            phone: z.string().optional(),
            notes: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'List clients.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.acuityscheduling.com/reference/get-clients
            endpoint: '/clients',
            params: {
                ...(input.search !== undefined && { search: input.search })
            },
            retries: 3
        });

        const rawClients = z.array(z.unknown()).parse(response.data);
        const clients = rawClients.map((client) => ProviderClientSchema.parse(client));

        return {
            clients: clients.map((client) => ({
                ...(client.firstName !== undefined && { firstName: client.firstName }),
                ...(client.lastName !== undefined && { lastName: client.lastName }),
                ...(client.email !== undefined && { email: client.email }),
                ...(client.phone !== undefined && { phone: client.phone }),
                ...(client.notes !== undefined && { notes: client.notes })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
