import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('User ID. Example: "be129d9b-50da-4485-9377-0d83e981f30b"'),
    name: z.string().optional().describe("User's preferred name."),
    email: z.string().optional().describe("User's email address."),
    accessRole: z.string().optional().describe("User's access role. One of: super admin, admin, team member, limited team member, interviewer."),
    jobTitle: z.string().nullable().optional().describe("User's job title."),
    photo: z.string().nullable().optional().describe("URL for user's gravatar."),
    externalDirectoryId: z.string().nullable().optional().describe('Unique Id for user in external HR directory.'),
    managerId: z.string().nullable().optional().describe("User's manager ID."),
    linkedContactIds: z.array(z.string()).nullable().optional().describe('An array of contact IDs associated with the user.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string().optional(),
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

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string().optional(),
    email: z.string().optional(),
    createdAt: z.number().optional(),
    deactivatedAt: z.number().optional(),
    externalDirectoryId: z.string().optional(),
    accessRole: z.string().optional(),
    photo: z.string().optional(),
    linkedContactIds: z.array(z.string()).optional(),
    jobTitle: z.string().optional(),
    managerId: z.string().optional()
});

const action = createAction({
    description: "Update an existing user's profile fields.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:write:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const getConfig: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation
            endpoint: `/v1/users/${encodeURIComponent(input.id)}`,
            retries: 3
        };
        const getResponse = await nango.get(getConfig);

        const getData = z.object({ data: ProviderUserSchema }).parse(getResponse.data);
        const existing = getData.data;

        const payload = {
            name: input.name !== undefined ? input.name : existing.name,
            email: input.email !== undefined ? input.email : existing.email,
            accessRole: input.accessRole !== undefined ? input.accessRole : existing.accessRole,
            ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle }),
            ...(input.photo !== undefined && { photo: input.photo }),
            ...(input.externalDirectoryId !== undefined && { externalDirectoryId: input.externalDirectoryId }),
            ...(input.managerId !== undefined && { managerId: input.managerId }),
            ...(input.linkedContactIds !== undefined && { linkedContactIds: input.linkedContactIds })
        };

        const putConfig: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation
            endpoint: `/v1/users/${encodeURIComponent(input.id)}`,
            data: payload,
            retries: 3
        };
        const putResponse = await nango.put(putConfig);

        const putData = z.object({ data: ProviderUserSchema }).parse(putResponse.data);

        return {
            id: putData.data.id,
            name: putData.data.name,
            ...(putData.data.username != null && { username: putData.data.username }),
            ...(putData.data.email != null && { email: putData.data.email }),
            ...(putData.data.createdAt != null && { createdAt: putData.data.createdAt }),
            ...(putData.data.deactivatedAt != null && { deactivatedAt: putData.data.deactivatedAt }),
            ...(putData.data.externalDirectoryId != null && { externalDirectoryId: putData.data.externalDirectoryId }),
            ...(putData.data.accessRole != null && { accessRole: putData.data.accessRole }),
            ...(putData.data.photo != null && { photo: putData.data.photo }),
            ...(putData.data.linkedContactIds != null && { linkedContactIds: putData.data.linkedContactIds }),
            ...(putData.data.jobTitle != null && { jobTitle: putData.data.jobTitle }),
            ...(putData.data.managerId != null && { managerId: putData.data.managerId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
