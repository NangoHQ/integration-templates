import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "6a616ba8908190d6d945815c"')
});

const ProviderUserSchema = z
    .object({
        id: z.string(),
        primaryEmail: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        companyId: z.string().optional(),
        role: z.string().optional(),
        isActive: z.boolean().optional(),
        createdDate: z.string().optional(),
        updatedDate: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    primaryEmail: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyId: z.string().optional(),
    role: z.string().optional(),
    isActive: z.boolean().optional(),
    createdDate: z.string().optional(),
    updatedDate: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single user by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            endpoint: `/v1/users/${encodeURIComponent(input.userId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                userId: input.userId
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.primaryEmail !== undefined && { primaryEmail: providerUser.primaryEmail }),
            ...(providerUser.firstName !== undefined && { firstName: providerUser.firstName }),
            ...(providerUser.lastName !== undefined && { lastName: providerUser.lastName }),
            ...(providerUser.companyId !== undefined && { companyId: providerUser.companyId }),
            ...(providerUser.role !== undefined && { role: providerUser.role }),
            ...(providerUser.isActive !== undefined && { isActive: providerUser.isActive }),
            ...(providerUser.createdDate !== undefined && { createdDate: providerUser.createdDate }),
            ...(providerUser.updatedDate !== undefined && { updatedDate: providerUser.updatedDate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
