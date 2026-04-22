import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('The ID of the project to unarchive. Example: "c1f3f3c8-8f3c-4f3c-8f3c-8f3c8f3c8f3c"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the unarchive operation was successful'),
    project_id: z.string().describe('The ID of the unarchived project')
});

const action = createAction({
    description: 'Restore an archived Linear project',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/unarchive-project',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers/graphql
            endpoint: '/graphql',
            data: {
                query: `
                    mutation ProjectUnarchive($id: String!) {
                        projectUnarchive(id: $id) {
                            success
                        }
                    }
                `,
                variables: {
                    id: input.project_id
                }
            },
            retries: 3
        });

        const responseData = response.data;
        if (!responseData || typeof responseData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Linear API',
                response: responseData
            });
        }

        // Handle GraphQL errors
        if ('errors' in responseData && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
            const firstError = responseData.errors[0];
            const errorMessage =
                firstError && typeof firstError === 'object' && 'message' in firstError && typeof firstError.message === 'string'
                    ? firstError.message
                    : 'GraphQL error occurred';
            throw new nango.ActionError({
                type: 'graphql_error',
                message: errorMessage,
                errors: responseData.errors
            });
        }

        // Validate success response structure
        if (
            !('data' in responseData) ||
            !responseData.data ||
            typeof responseData.data !== 'object' ||
            !('projectUnarchive' in responseData.data) ||
            !responseData.data.projectUnarchive ||
            typeof responseData.data.projectUnarchive !== 'object' ||
            !('success' in responseData.data.projectUnarchive) ||
            typeof responseData.data.projectUnarchive.success !== 'boolean'
        ) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Linear API',
                response: responseData
            });
        }

        return {
            success: responseData.data.projectUnarchive.success,
            project_id: input.project_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
