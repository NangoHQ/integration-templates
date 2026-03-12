import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner_id: z.string().describe('HubSpot owner ID. Example: "123"')
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.union([z.string(), z.null()]),
    first_name: z.union([z.string(), z.null()]),
    last_name: z.union([z.string(), z.null()]),
    user_id: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Get an owner by ID',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/get-owner',
        group: 'Owners'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.owners.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.hubspot.com/docs/api-reference/crm-crm-owners-v3/owners/get-crm-v3-owners-ownerId
            endpoint: `/crm/v3/owners/${input.owner_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Owner not found',
                owner_id: input.owner_id
            });
        }

        const owner = response.data;

        return {
            id: owner.id,
            email: owner.email ?? null,
            first_name: owner.firstName ?? null,
            last_name: owner.lastName ?? null,
            user_id: owner.userId ? String(owner.userId) : null,
            created_at: owner.createdAt ?? null,
            updated_at: owner.updatedAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
