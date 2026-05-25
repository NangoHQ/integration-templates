import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    directoryRoleId: z.string().describe('The unique identifier for the directory role. Example: "c35aa61d-9e3d-419e-84a9-24767a8a9988"')
});

const ProviderDirectoryRoleSchema = z.object({
    id: z.string(),
    deletedDateTime: z.string().nullable().optional(),
    description: z.string().optional(),
    displayName: z.string().optional(),
    roleTemplateId: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    description: z.string().optional(),
    displayName: z.string().optional(),
    roleTemplateId: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single directory role from Microsoft.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-directory-role',
        group: 'Directory Roles'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['RoleManagement.Read.Directory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/directoryrole-get
        const response = await nango.get({
            endpoint: `/v1.0/directoryRoles/${encodeURIComponent(input.directoryRoleId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Directory role not found',
                directoryRoleId: input.directoryRoleId
            });
        }

        const providerRole = ProviderDirectoryRoleSchema.parse(response.data);

        return {
            id: providerRole.id,
            ...(providerRole.description !== undefined && { description: providerRole.description }),
            ...(providerRole.displayName !== undefined && { displayName: providerRole.displayName }),
            ...(providerRole.roleTemplateId !== undefined && { roleTemplateId: providerRole.roleTemplateId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
