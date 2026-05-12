import { z } from 'zod';
import { createAction } from 'nango';

const ListRoutingFormsInputSchema = z.object({
    organization: z
        .string()
        .optional()
        .describe("The URI of the organization to list routing forms for. If not provided, the action will fetch the current user's organization."),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    count: z.number().int().optional().describe('Number of results per page. Default is 20.')
});

const RoutingFormSchema = z.object({
    uri: z.string().describe('Canonical reference (unique identifier) for the routing form.'),
    uuid: z.string().describe('Unique identifier for the routing form.'),
    name: z.string().describe('The routing form name (in human-readable format).'),
    organization: z.string().describe('The URI of the organization associated with the routing form.'),
    status: z.string().describe('The status of the routing form (e.g., active, disabled).'),
    created_at: z.string().describe('ISO 8601 timestamp when the routing form was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the routing form was last updated.')
});

const ListRoutingFormsOutputSchema = z.object({
    items: z.array(RoutingFormSchema),
    next_cursor: z.string().optional().describe('Cursor for the next page of results.')
});

const action = createAction({
    description: 'List routing forms from Calendly',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-routing-forms',
        group: 'Routing Forms'
    },
    input: ListRoutingFormsInputSchema,
    output: ListRoutingFormsOutputSchema,
    scopes: ['routing_forms:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListRoutingFormsOutputSchema>> => {
        let organizationUri = input.organization;

        // Fetch the current user's organization if not provided
        if (!organizationUri) {
            // https://developer.calendly.com/api-docs/dfe802d974450-get-current-user
            const userResponse = await nango.get({
                endpoint: '/users/me',
                retries: 3
            });

            const UserResponseSchema = z.object({
                resource: z.object({
                    current_organization: z.string()
                })
            });

            const userData = UserResponseSchema.parse(userResponse.data);
            organizationUri = userData.resource.current_organization;
        }

        const params: Record<string, string | number> = {
            organization: organizationUri
        };

        if (input.cursor) {
            params['cursor'] = input.cursor;
        }

        if (input.count !== undefined) {
            params['count'] = input.count;
        }

        // https://developer.calendly.com/api-docs/9fe7334bec6ad-list-routing-forms
        const response = await nango.get({
            endpoint: '/routing_forms',
            params,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            collection: z.array(
                z.object({
                    uri: z.string(),
                    uuid: z.string(),
                    name: z.string(),
                    organization: z.string(),
                    status: z.string(),
                    created_at: z.string(),
                    updated_at: z.string()
                })
            ),
            pagination: z
                .object({
                    next_cursor: z.string().optional()
                })
                .optional()
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const items = parsed.collection.map((item) => ({
            uri: item.uri,
            uuid: item.uuid,
            name: item.name,
            organization: item.organization,
            status: item.status,
            created_at: item.created_at,
            updated_at: item.updated_at
        }));

        return {
            items,
            ...(parsed.pagination?.next_cursor != null && { next_cursor: parsed.pagination.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
