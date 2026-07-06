import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The ID of the user to reactivate. Example: "be129d9b-50da-4485-9377-0d83e981f30b"')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            id: z.string(),
            name: z.string(),
            username: z.string().optional(),
            email: z.string().optional(),
            createdAt: z.number().optional(),
            deactivatedAt: z.number().nullable().optional(),
            accessRole: z.string().optional(),
            photo: z.union([z.string(), z.object({}), z.null()]).optional(),
            externalAuthorizationId: z.string().nullable().optional()
        })
        .passthrough()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string().optional(),
    email: z.string().optional(),
    createdAt: z.number().optional(),
    deactivatedAt: z.number().optional(),
    accessRole: z.string().optional(),
    photo: z.string().optional(),
    externalAuthorizationId: z.string().optional()
});

const action = createAction({
    description: 'Reactivate a previously deactivated user account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://hire.lever.co/developer/documentation
            endpoint: `/v1/users/${encodeURIComponent(input.userId)}/reactivate`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerUser = providerResponse.data;

        let normalizedPhoto: string | undefined;
        if (typeof providerUser.photo === 'string') {
            normalizedPhoto = providerUser.photo;
        }

        return {
            id: providerUser.id,
            name: providerUser.name,
            ...(providerUser.username !== undefined && { username: providerUser.username }),
            ...(providerUser.email !== undefined && { email: providerUser.email }),
            ...(providerUser.createdAt !== undefined && { createdAt: providerUser.createdAt }),
            ...(providerUser.deactivatedAt != null && { deactivatedAt: providerUser.deactivatedAt }),
            ...(providerUser.accessRole !== undefined && { accessRole: providerUser.accessRole }),
            ...(normalizedPhoto !== undefined && { photo: normalizedPhoto }),
            ...(providerUser.externalAuthorizationId != null && { externalAuthorizationId: providerUser.externalAuthorizationId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
