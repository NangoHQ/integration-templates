import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "6a616ba8908190d6d945815c"')
});

const ProviderUserSchema = z
    .object({
        id: z.string(),
        primaryEmail: z.string().nullable().optional(),
        firstName: z.string().nullable().optional(),
        lastName: z.string().nullable().optional(),
        companyId: z.string().nullable().optional(),
        role: z.string().nullable().optional(),
        isActive: z.boolean().nullable().optional(),
        createdDate: z.string().nullable().optional(),
        updatedDate: z.string().nullable().optional()
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
            ...(providerUser.primaryEmail != null && { primaryEmail: providerUser.primaryEmail }),
            ...(providerUser.firstName != null && { firstName: providerUser.firstName }),
            ...(providerUser.lastName != null && { lastName: providerUser.lastName }),
            ...(providerUser.companyId != null && { companyId: providerUser.companyId }),
            ...(providerUser.role != null && { role: providerUser.role }),
            ...(providerUser.isActive != null && { isActive: providerUser.isActive }),
            ...(providerUser.createdDate != null && { createdDate: providerUser.createdDate }),
            ...(providerUser.updatedDate != null && { updatedDate: providerUser.updatedDate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
