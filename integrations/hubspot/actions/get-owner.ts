import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ownerId: z.string().describe('HubSpot owner ID. Example: "123"')
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    userId: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
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
            endpoint: `/crm/v3/owners/${input.ownerId}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Owner not found',
                ownerId: input.ownerId
            });
        }

        const owner = response.data;

        return {
            id: owner.id,
            email: owner.email ?? undefined,
            firstName: owner.firstName ?? undefined,
            lastName: owner.lastName ?? undefined,
            userId: owner.userId ? String(owner.userId) : undefined,
            createdAt: owner.createdAt ?? undefined,
            updatedAt: owner.updatedAt ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
