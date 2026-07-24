import { z } from 'zod';
import { createAction } from 'nango';

const PermissionSetSchema = z.object({
    id: z.string(),
    name: z.string(),
    label: z.record(z.string(), z.string()).optional(),
    description: z.record(z.string(), z.string()).optional()
});

const OutputSchema = z.object({
    permission_sets: z.array(PermissionSetSchema)
});

const action = createAction({
    description:
        "List the account's available custom permission sets/roles. Use the `name` field (not id/label) when assigning custom roles via update-member/invite-member.",
    version: '1.0.0',
    input: z.object({}),
    output: OutputSchema,
    scopes: ['r_account'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://workable.readme.io/reference/permission-sets
        const response = await nango.get({
            endpoint: '/spi/v3/permission_sets',
            retries: 3
        });

        const rawSets = z.array(z.unknown()).parse(response.data);

        const permission_sets = rawSets.map((item: unknown) => {
            const set = PermissionSetSchema.parse(item);
            return {
                id: set.id,
                name: set.name,
                ...(set.label !== undefined && { label: set.label }),
                ...(set.description !== undefined && { description: set.description })
            };
        });

        return { permission_sets };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
