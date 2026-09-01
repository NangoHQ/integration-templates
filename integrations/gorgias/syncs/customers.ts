import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CustomerChannelSchema = z.object({
    type: z.string().optional().describe('The type of contact channel (e.g., email, phone).'),
    address: z.string().optional().describe('The address or handle for the channel.'),
    preferred: z.boolean().optional().describe('Whether this channel is the preferred contact method.')
});

const CustomerSchema = z
    .object({
        id: z.string().describe('The unique identifier of the customer.'),
        email: z.string().optional().describe('The primary email address of the customer.'),
        name: z.string().optional().describe('The full name of the customer.'),
        firstname: z.string().optional().describe('The first name of the customer.'),
        lastname: z.string().optional().describe('The last name of the customer.'),
        channels: z.array(CustomerChannelSchema).optional().describe('The contact channels associated with the customer.'),
        created_datetime: z.string().optional().describe('The ISO 8601 timestamp when the customer was created.'),
        updated_datetime: z.string().optional().describe('The ISO 8601 timestamp when the customer was last updated.')
    })
    .describe('A Gorgias customer record with contact channels and timestamps.');

const ProviderCustomerSchema = z.object({
    id: z.number(),
    email: z.string().nullish(),
    name: z.string().nullish(),
    firstname: z.string().nullish(),
    lastname: z.string().nullish(),
    channels: z
        .array(
            z.object({
                type: z.string().nullish(),
                address: z.string().nullish(),
                preferred: z.boolean().nullish()
            })
        )
        .nullish(),
    created_datetime: z.string().nullish(),
    updated_datetime: z.string().nullish()
});

type Customer = z.infer<typeof CustomerSchema>;

const sync = createSync({
    description: 'Sync customers and their contact channels.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Customer: CustomerSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Customer');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/list-customers
            endpoint: '/api/customers',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const customers: Customer[] = [];

            for (const raw of batch) {
                const parsed = ProviderCustomerSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse customer: ${parsed.error.message}`);
                }

                const record = parsed.data;

                customers.push({
                    id: String(record.id),
                    ...(record.email != null && { email: record.email }),
                    ...(record.name != null && { name: record.name }),
                    ...(record.firstname != null && { firstname: record.firstname }),
                    ...(record.lastname != null && { lastname: record.lastname }),
                    ...(record.channels != null && {
                        channels: record.channels.map((channel) => ({
                            ...(channel.type != null && { type: channel.type }),
                            ...(channel.address != null && { address: channel.address }),
                            ...(channel.preferred != null && { preferred: channel.preferred })
                        }))
                    }),
                    ...(record.created_datetime != null && { created_datetime: record.created_datetime }),
                    ...(record.updated_datetime != null && { updated_datetime: record.updated_datetime })
                });
            }

            if (customers.length > 0) {
                await nango.batchSave(customers, 'Customer');
            }
        }

        await nango.trackDeletesEnd('Customer');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
