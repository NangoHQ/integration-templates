import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('User\'s preferred name. Example: "Chandler Bing"'),
    email: z.string().describe('User\'s email address. Example: "chandler@example.com"'),
    accessRole: z
        .string()
        .optional()
        .describe("User's access role. One of: super admin, admin, team member, limited team member, interviewer. Defaults to interviewer."),
    externalDirectoryId: z.string().optional().describe('Unique Id for user in external HR directory. Example: "2277399"'),
    jobTitle: z.string().optional().describe('User\'s job title. Example: "IT procurements manager"'),
    managerId: z.string().optional().describe('User\'s manager ID. Example: "1da88e6b-c49f-4945-a9fc-c1ce2d36c031"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    email: z.string(),
    createdAt: z.number(),
    deactivatedAt: z.number().nullable().optional(),
    externalDirectoryId: z.string().nullable().optional(),
    accessRole: z.string(),
    photo: z.string().nullable().optional(),
    linkedContactIds: z.array(z.string()).nullable().optional(),
    jobTitle: z.string().nullable().optional(),
    managerId: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderUserSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    email: z.string(),
    createdAt: z.number(),
    deactivatedAt: z.number().optional(),
    externalDirectoryId: z.string().optional(),
    accessRole: z.string(),
    photo: z.string().optional(),
    linkedContactIds: z.array(z.string()).optional(),
    jobTitle: z.string().optional(),
    managerId: z.string().optional()
});

const action = createAction({
    description: 'Create a new user on the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:write:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://hire.lever.co/developer/documentation
            endpoint: '/v1/users',
            data: {
                name: input.name,
                email: input.email,
                ...(input.accessRole !== undefined && { accessRole: input.accessRole }),
                ...(input.externalDirectoryId !== undefined && { externalDirectoryId: input.externalDirectoryId }),
                ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle }),
                ...(input.managerId !== undefined && { managerId: input.managerId })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerUser = providerResponse.data;

        return {
            id: providerUser.id,
            name: providerUser.name,
            username: providerUser.username,
            email: providerUser.email,
            createdAt: providerUser.createdAt,
            ...(providerUser.deactivatedAt != null && { deactivatedAt: providerUser.deactivatedAt }),
            ...(providerUser.externalDirectoryId != null && { externalDirectoryId: providerUser.externalDirectoryId }),
            accessRole: providerUser.accessRole,
            ...(providerUser.photo != null && { photo: providerUser.photo }),
            ...(providerUser.linkedContactIds != null && { linkedContactIds: providerUser.linkedContactIds }),
            ...(providerUser.jobTitle != null && { jobTitle: providerUser.jobTitle }),
            ...(providerUser.managerId != null && { managerId: providerUser.managerId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
