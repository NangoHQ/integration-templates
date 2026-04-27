import { z } from 'zod';
import { createAction } from 'nango';
import type { NangoAction } from 'nango';

/**
 * Get Base Collaborators
 *
 * Retrieve collaborators and permissions for an Airtable base using the Metadata API.
 *
 * API docs: https://airtable.com/developers/web/api/get-base-collaborators
 */

// Input schema
const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base')
});

type Input = z.infer<typeof InputSchema>;

// Workspace collaborator with additional fields
const WorkspaceCollaboratorSchema = z.object({
    userId: z.string().optional(),
    email: z.string().optional(),
    permissionLevel: z.string().optional(),
    createdTime: z.string().optional(),
    grantedByUserId: z.string().optional()
});

// Collaborators container schema
const CollaboratorsContainerSchema = z.object({
    workspaceCollaborators: z.array(WorkspaceCollaboratorSchema).optional(),
    baseCollaborators: z.array(WorkspaceCollaboratorSchema).optional()
});

// Output schema - matching the Airtable API response structure
const OutputSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    permissionLevel: z.string().optional(),
    createdTime: z.string().optional(),
    workspaceId: z.string().optional(),
    collaborators: CollaboratorsContainerSchema.optional(),
    individualCollaborators: CollaboratorsContainerSchema.optional(),
    groupCollaborators: CollaboratorsContainerSchema.optional()
});

type Output = z.infer<typeof OutputSchema>;

export default createAction<typeof InputSchema, typeof OutputSchema>({
    description: 'Retrieve collaborators and permissions for an Airtable base',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        method: 'POST',
        path: '/actions/get-base-collaborators'
    },
    scopes: ['base:read'],
    exec: async (nango: NangoAction, input: Input): Promise<Output> => {
        // API docs: https://airtable.com/developers/web/api/get-base-collaborators
        const response = await nango.get({
            endpoint: `/v0/meta/bases/${input.baseId}`,
            params: {
                include: 'collaborators'
            },
            retries: 3
        });

        const data = response.data;

        // Validate and return the response
        const result = OutputSchema.safeParse(data);
        if (!result.success) {
            throw new nango.ActionError({
                message: 'Invalid response from Airtable API',
                errors: result.error.issues
            });
        }

        return result.data;
    }
});
