import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The ID of the user to retrieve grants for. Example: "auth0|1234567890"')
});

const GrantSchema = z.object({
    id: z.string(),
    clientID: z.string(),
    user_id: z.string(),
    audience: z.string(),
    scope: z.array(z.string())
});

const OutputSchema = z.object({
    grants: z.array(GrantSchema)
});

const PaginatedResponseSchema = z.object({
    start: z.number(),
    limit: z.number(),
    total: z.number(),
    grants: z.array(z.unknown())
});

const action = createAction({
    description: 'Get the grants associated with a user in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-user-grants',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:grants'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const grants: z.infer<typeof GrantSchema>[] = [];
        const perPage = 100;
        let page = 0;
        let total = 0;

        do {
            // https://auth0.com/docs/api/management/v2/grants/get-grants
            const response = await nango.get({
                endpoint: '/api/v2/grants',
                params: {
                    user_id: input.userId,
                    page: String(page),
                    per_page: String(perPage),
                    include_totals: 'true'
                },
                retries: 3
            });

            const paginatedResponse = PaginatedResponseSchema.parse(response.data);
            total = paginatedResponse.total;

            for (const grant of paginatedResponse.grants) {
                const parsedGrant = GrantSchema.parse(grant);
                grants.push(parsedGrant);
            }

            page += 1;
        } while (grants.length < total);

        return { grants };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
