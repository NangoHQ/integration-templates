import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('The ID of the project to update. Example: "project-123"'),
    name: z.string().optional().describe('New name for the project.'),
    description: z.string().optional().describe('New description for the project.'),
    status: z.string().optional().describe('New status for the project (e.g., planned, started, paused, completed, canceled).'),
    targetDate: z.string().optional().describe('Target date for the project completion in ISO 8601 format (YYYY-MM-DD).'),
    leadId: z.string().optional().describe('ID of the user to set as the project lead.')
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the updated project.'),
    name: z.union([z.string(), z.null()]).describe('The name of the project.'),
    description: z.union([z.string(), z.null()]).describe('The description of the project.'),
    status: z.union([z.string(), z.null()]).describe('The status type of the project (e.g., planned, started, paused, completed, canceled).'),
    targetDate: z.union([z.string(), z.null()]).describe('The target date of the project.'),
    leadId: z.union([z.string(), z.null()]).describe('The ID of the project lead.')
});

const action = createAction({
    description: 'Update an existing Linear project.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-project',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateInput: {
            name?: string;
            description?: string;
            status?: string;
            targetDate?: string;
            leadId?: string;
        } = {};

        if (input.name !== undefined) {
            updateInput.name = input.name;
        }
        if (input.description !== undefined) {
            updateInput.description = input.description;
        }
        if (input.status !== undefined) {
            updateInput.status = input.status;
        }
        if (input.targetDate !== undefined) {
            updateInput.targetDate = input.targetDate;
        }
        if (input.leadId !== undefined) {
            updateInput.leadId = input.leadId;
        }

        const mutationVariables = {
            id: input.projectId,
            input: updateInput
        };

        // https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/objects/Mutation#projectUpdate
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    mutation ProjectUpdate($id: String!, $input: ProjectUpdateInput!) {
                        projectUpdate(id: $id, input: $input) {
                            success
                            project {
                                id
                                name
                                description
                                status {
                                    type
                                }
                                targetDate
                                lead {
                                    id
                                }
                            }
                        }
                    }
                `,
                variables: mutationVariables
            },
            retries: 3
        });

        const projectData = response.data?.data?.projectUpdate?.project;

        if (!projectData) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update project or project not found.'
            });
        }

        return {
            id: projectData.id,
            name: projectData.name ?? null,
            description: projectData.description ?? null,
            status: projectData.status?.type ?? null,
            targetDate: projectData.targetDate ?? null,
            leadId: projectData.lead?.id ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
