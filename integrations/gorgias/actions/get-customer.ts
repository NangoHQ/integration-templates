import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        customer_id: z.number().describe('The unique identifier of the customer to retrieve. Example: 519543245')
    })
    .describe('Input parameters for retrieving a single Gorgias customer by ID.');

const ChannelSchema = z.object({
    type: z.string().describe('The channel type (e.g., email, phone).'),
    address: z.string().describe('The channel address (e.g., email address or phone number).'),
    preferred: z.boolean().describe('Whether this channel is the preferred contact method for the customer.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the customer.'),
        name: z.string().optional().describe('The full name of the customer.'),
        firstname: z.string().optional().describe('The first name of the customer.'),
        lastname: z.string().optional().describe('The last name of the customer.'),
        channels: z.array(ChannelSchema).describe('The contact channels associated with the customer.')
    })
    .describe('A single Gorgias customer record, including their contact channels.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single customer record from the provider.
 * @pitfalls: The `firstname` and `lastname` output fields are read-only server-side splits of the `name` field; the provider only accepts `name` for customer writes and will reject `firstname` or `lastname` inputs.
 */
const action = createAction({
    description: 'Retrieve a single customer, including their contact channels.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/get-customer
            endpoint: `/api/customers/${encodeURIComponent(input.customer_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer not found',
                customer_id: input.customer_id
            });
        }

        const customer = z
            .object({
                id: z.number(),
                name: z.string().nullable().optional(),
                firstname: z.string().optional().nullable(),
                lastname: z.string().optional().nullable(),
                channels: z
                    .array(
                        z.object({
                            type: z.string(),
                            address: z.string(),
                            preferred: z.boolean()
                        })
                    )
                    .optional()
            })
            .parse(response.data);

        return {
            id: customer.id,
            ...(customer.name != null && { name: customer.name }),
            ...(customer.firstname != null && { firstname: customer.firstname }),
            ...(customer.lastname != null && { lastname: customer.lastname }),
            channels: customer.channels || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
