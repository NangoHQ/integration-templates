import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('The number of locations to return. Maximum 250.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    includeInactive: z.boolean().optional().describe('Whether to include deactivated locations.'),
    name: z.string().optional().describe('Filter locations by name.')
});

const LocationAddressSchema = z.object({
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    country: z.string().optional(),
    zip: z.string().optional(),
    phone: z.string().optional(),
    formatted: z.array(z.string()).optional()
});

const LocationSchema = z.object({
    id: z.string(),
    name: z.string(),
    address: LocationAddressSchema.optional(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    legacyResourceId: z.string().optional()
});

const OutputSchema = z.object({
    locations: z.array(LocationSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Shopify locations for the connected store.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_locations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables: {
            first?: number;
            after?: string;
            includeInactive?: boolean;
            query?: string;
        } = {};
        variables.first = input.first ?? 50;
        if (input.after !== undefined) {
            variables.after = input.after;
        }
        if (input.includeInactive !== undefined) {
            variables.includeInactive = input.includeInactive;
        }
        if (input.name !== undefined && input.name.length > 0) {
            variables.query = `name:"${input.name.replace(/"/g, '\\"')}"`;
        }

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2025-04/queries/locations
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query: `
                    query Locations($first: Int, $after: String, $includeInactive: Boolean, $query: String) {
                        locations(first: $first, after: $after, includeInactive: $includeInactive, query: $query) {
                            nodes {
                                id
                                name
                                address {
                                    address1
                                    address2
                                    city
                                    province
                                    country
                                    zip
                                    phone
                                    formatted
                                }
                                isActive
                                createdAt
                                updatedAt
                                legacyResourceId
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);

        const GraphQLResponseSchema = z.object({
            data: z.unknown().optional().nullable(),
            errors: z.array(z.object({ message: z.string() }).passthrough()).optional()
        });

        const raw = GraphQLResponseSchema.parse(response.data);

        if (raw.errors && raw.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: raw.errors.map((e) => e.message).join('; ')
            });
        }

        const LocationsConnectionSchema = z.object({
            locations: z.object({
                nodes: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string(),
                        address: z
                            .object({
                                address1: z.string().nullable().optional(),
                                address2: z.string().nullable().optional(),
                                city: z.string().nullable().optional(),
                                province: z.string().nullable().optional(),
                                country: z.string().nullable().optional(),
                                zip: z.string().nullable().optional(),
                                phone: z.string().nullable().optional(),
                                formatted: z.array(z.string()).optional()
                            })
                            .optional(),
                        isActive: z.boolean(),
                        createdAt: z.string(),
                        updatedAt: z.string(),
                        legacyResourceId: z.string().optional()
                    })
                ),
                pageInfo: z.object({
                    hasNextPage: z.boolean(),
                    endCursor: z.string().nullable().optional()
                })
            })
        });

        const parsed = LocationsConnectionSchema.parse(raw.data);

        return {
            locations: parsed.locations.nodes.map((node) => ({
                id: node.id,
                name: node.name,
                ...(node.address != null && {
                    address: {
                        ...(node.address.address1 != null && { address1: node.address.address1 }),
                        ...(node.address.address2 != null && { address2: node.address.address2 }),
                        ...(node.address.city != null && { city: node.address.city }),
                        ...(node.address.province != null && { province: node.address.province }),
                        ...(node.address.country != null && { country: node.address.country }),
                        ...(node.address.zip != null && { zip: node.address.zip }),
                        ...(node.address.phone != null && { phone: node.address.phone }),
                        ...(node.address.formatted != null && { formatted: node.address.formatted })
                    }
                }),
                isActive: node.isActive,
                createdAt: node.createdAt,
                updatedAt: node.updatedAt,
                ...(node.legacyResourceId != null && { legacyResourceId: node.legacyResourceId })
            })),
            ...(parsed.locations.pageInfo.hasNextPage && parsed.locations.pageInfo.endCursor != null ? { nextCursor: parsed.locations.pageInfo.endCursor } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
