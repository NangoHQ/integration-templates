import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Shopify GraphQL location ID. Example: "gid://shopify/Location/1234567890"')
});

const LocationAddressSchema = z.object({
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    countryCode: z.string().nullable().optional(),
    formatted: z.array(z.string()).optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    phone: z.string().nullable().optional(),
    province: z.string().nullable().optional(),
    provinceCode: z.string().nullable().optional(),
    zip: z.string().nullable().optional()
});

const ProviderLocationSchema = z.object({
    id: z.string(),
    name: z.string(),
    address: LocationAddressSchema,
    fulfillsOnlineOrders: z.boolean(),
    isActive: z.boolean()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    address: LocationAddressSchema,
    fulfillsOnlineOrders: z.boolean(),
    isActive: z.boolean()
});

const action = createAction({
    description: 'Retrieve a Shopify location by GraphQL ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_locations'],

    exec: async (nango, input) => {
        const query = `
            query GetLocation($id: ID!) {
                location(id: $id) {
                    id
                    name
                    address {
                        address1
                        address2
                        city
                        country
                        countryCode
                        formatted
                        latitude
                        longitude
                        phone
                        province
                        provinceCode
                        zip
                    }
                    fulfillsOnlineOrders
                    isActive
                }
            }
        `;

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/queries/location
            endpoint: 'admin/api/2026-04/graphql.json',
            data: {
                query,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        const rawBody = z
            .object({
                data: z.object({
                    location: ProviderLocationSchema.nullable()
                })
            })
            .parse(response.data);

        const location = rawBody.data.location;

        if (!location) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Location not found',
                id: input.id
            });
        }

        return {
            id: location.id,
            name: location.name,
            address: location.address,
            fulfillsOnlineOrders: location.fulfillsOnlineOrders,
            isActive: location.isActive
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
