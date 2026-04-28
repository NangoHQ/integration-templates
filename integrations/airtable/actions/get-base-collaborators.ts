import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('Airtable base ID. Example: "appXXXXXXXXXXXXXX"')
});

const GroupCollaboratorSchema = z.object({
    createdTime: z.string().optional(),
    grantedByUserId: z.string().optional(),
    groupId: z.string().optional(),
    name: z.string().optional(),
    permissionLevel: z.string().optional()
});

const IndividualCollaboratorSchema = z.object({
    createdTime: z.string().optional(),
    grantedByUserId: z.string().optional(),
    userId: z.string().optional(),
    email: z.string().optional(),
    permissionLevel: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    permissionLevel: z.string().optional(),
    workspaceId: z.string().optional(),
    groupCollaborators: z
        .object({
            viaBase: z.array(GroupCollaboratorSchema).optional(),
            viaWorkspace: z.array(GroupCollaboratorSchema).optional()
        })
        .optional(),
    individualCollaborators: z
        .object({
            viaBase: z.array(IndividualCollaboratorSchema).optional(),
            viaWorkspace: z.array(IndividualCollaboratorSchema).optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    permissionLevel: z.string().optional(),
    workspaceId: z.string().optional(),
    groupCollaborators: z
        .object({
            baseCollaborators: z.array(GroupCollaboratorSchema).optional(),
            workspaceCollaborators: z.array(GroupCollaboratorSchema).optional()
        })
        .optional(),
    individualCollaborators: z
        .object({
            baseCollaborators: z.array(IndividualCollaboratorSchema).optional(),
            workspaceCollaborators: z.array(IndividualCollaboratorSchema).optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve collaborators and permissions for an Airtable base.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-base-collaborators',
        group: 'Bases'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schema.bases:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/get-base-collaborators
        const response = await nango.get({
            endpoint: `v0/meta/bases/${input.baseId}`,
            params: {
                include: 'collaborators'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Base not found or no collaborators available.',
                baseId: input.baseId
            });
        }

        const data = ProviderResponseSchema.parse(response.data);

        return {
            id: data.id,
            name: data.name,
            permissionLevel: data.permissionLevel,
            workspaceId: data.workspaceId,
            groupCollaborators: data.groupCollaborators
                ? {
                      viaBase: data.groupCollaborators.baseCollaborators || [],
                      viaWorkspace: data.groupCollaborators.workspaceCollaborators || []
                  }
                : undefined,
            individualCollaborators: data.individualCollaborators
                ? {
                      viaBase: data.individualCollaborators.baseCollaborators || [],
                      viaWorkspace: data.individualCollaborators.workspaceCollaborators || []
                  }
                : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
