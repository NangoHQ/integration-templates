import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('GraphQL ID of the segment. Example: "gid://shopify/Segment/1234567890"')
});

const ProviderCustomerSegmentSchema = z.object({
    name: z.string().nullable(),
    query: z.string().nullable(),
    creationDate: z.string().nullable(),
    lastEditDate: z.string().nullable()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            segment: ProviderCustomerSegmentSchema.nullable()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z.record(z.string(), z.unknown()).optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    name: z.string(),
    query: z.string(),
    creationDate: z.string(),
    lastEditDate: z.string()
});

const action = createAction({
    description: 'Retrieve a Shopify customer segment by GraphQL ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2024-10/queries/segment
            endpoint: '/admin/api/2024-10/graphql.json',
            data: {
                query: `
                    query GetSegment($id: ID!) {
                        segment(id: $id) {
                            name
                            query
                            creationDate
                            lastEditDate
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const parsed = z.record(z.string(), z.unknown()).parse(response.data);

        const graphQLResponse = GraphQLResponseSchema.parse(parsed);

        if (graphQLResponse.errors && graphQLResponse.errors.length > 0) {
            const firstError = graphQLResponse.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: firstError.message,
                    errors: graphQLResponse.errors
                });
            }
        }

        const segment = graphQLResponse.data && graphQLResponse.data.segment;

        if (!segment) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Customer segment not found for ID: ${input.id}`
            });
        }

        if (segment.name == null || segment.query == null || segment.creationDate == null || segment.lastEditDate == null) {
            throw new nango.ActionError({
                type: 'incomplete_data',
                message: 'Customer segment data is incomplete.'
            });
        }

        return {
            name: segment.name,
            query: segment.query,
            creationDate: segment.creationDate,
            lastEditDate: segment.lastEditDate
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
