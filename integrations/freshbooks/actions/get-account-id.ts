import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const OutputSchema = z.object({
    accountId: z.string().describe('Alphanumeric account identifier for /accounting/ endpoints. Example: "ZyQ04o"'),
    businessId: z.number().int().describe('Numeric business identifier for /projects/ and /timetracking/ endpoints. Example: 14719708')
});

const ProviderResponseSchema = z
    .object({
        response: z
            .object({
                business_memberships: z.array(
                    z
                        .object({
                            business: z
                                .object({
                                    account_id: z.string(),
                                    id: z.number().int()
                                })
                                .passthrough()
                        })
                        .passthrough()
                )
            })
            .passthrough()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve the FreshBooks accountId and businessId for the authenticated user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:profile:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.freshbooks.com/api
        const response = await nango.get({
            endpoint: '/auth/api/v1/users/me',
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const firstMembership = providerData.response.business_memberships[0];

        if (!firstMembership || !firstMembership.business) {
            throw new nango.ActionError({
                type: 'missing_membership',
                message: 'No business membership found for the authenticated user.'
            });
        }

        return {
            accountId: firstMembership.business.account_id,
            businessId: firstMembership.business.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
