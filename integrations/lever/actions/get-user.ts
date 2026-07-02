import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user: z.string().describe('User ID. Example: "be129d9b-50da-4485-9377-0d83e981f30b"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    email: z.string(),
    accessRole: z.string(),
    photo: z.string().nullable(),
    createdAt: z.number(),
    deactivatedAt: z.string().nullable(),
    externalDirectoryId: z.string().nullable(),
    linkedContactIds: z.array(z.string()).nullable(),
    jobTitle: z.string().nullable(),
    managerId: z.string().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    email: z.string(),
    accessRole: z.string(),
    createdAt: z.number(),
    photo: z.string().optional(),
    deactivatedAt: z.string().optional(),
    externalDirectoryId: z.string().optional(),
    linkedContactIds: z.array(z.string()).optional(),
    jobTitle: z.string().optional(),
    managerId: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://hire.lever.co/developer/documentation#get-a-single-user
            endpoint: `/v1/users/${encodeURIComponent(input.user)}`,
            retries: 3
        });

        const providerUser = ProviderUserSchema.parse(response.data.data);

        return {
            id: providerUser.id,
            name: providerUser.name,
            username: providerUser.username,
            email: providerUser.email,
            accessRole: providerUser.accessRole,
            createdAt: providerUser.createdAt,
            ...(providerUser.photo != null && { photo: providerUser.photo }),
            ...(providerUser.deactivatedAt != null && { deactivatedAt: providerUser.deactivatedAt }),
            ...(providerUser.externalDirectoryId != null && { externalDirectoryId: providerUser.externalDirectoryId }),
            ...(providerUser.linkedContactIds != null && { linkedContactIds: providerUser.linkedContactIds }),
            ...(providerUser.jobTitle != null && { jobTitle: providerUser.jobTitle }),
            ...(providerUser.managerId != null && { managerId: providerUser.managerId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
