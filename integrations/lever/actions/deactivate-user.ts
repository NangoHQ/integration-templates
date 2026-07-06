import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The ID of the user to deactivate. Example: "be129d9b-50da-4485-9377-0d83e981f30b"')
});

const ProviderUserSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        username: z.string().optional(),
        email: z.string().optional(),
        accessRole: z.string().optional(),
        photo: z.string().nullable().optional(),
        createdAt: z.number().optional(),
        deactivatedAt: z.number().optional(),
        externalDirectoryId: z.string().nullable().optional(),
        linkedContactIds: z.array(z.string()).nullable().optional(),
        jobTitle: z.string().nullable().optional(),
        managerId: z.string().nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: ProviderUserSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    username: z.string().optional(),
    email: z.string().optional(),
    accessRole: z.string().optional(),
    createdAt: z.number().optional(),
    deactivatedAt: z.number().optional()
});

const action = createAction({
    description: 'Deactivate a user account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://hire.lever.co/developer/documentation
            endpoint: `/v1/users/${encodeURIComponent(input.userId)}/deactivate`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found or deactivation failed',
                userId: input.userId
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerUser = providerResponse.data;

        return {
            id: providerUser.id,
            ...(providerUser.name !== undefined && { name: providerUser.name }),
            ...(providerUser.username !== undefined && { username: providerUser.username }),
            ...(providerUser.email !== undefined && { email: providerUser.email }),
            ...(providerUser.accessRole !== undefined && { accessRole: providerUser.accessRole }),
            ...(providerUser.createdAt !== undefined && { createdAt: providerUser.createdAt }),
            ...(providerUser.deactivatedAt !== undefined && { deactivatedAt: providerUser.deactivatedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
