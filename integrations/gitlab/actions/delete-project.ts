import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('The ID or URL-encoded path of the project. Example: "82599306" or "group/project".'),
    archive: z.boolean().optional().describe('If true, archive the project instead of permanently deleting it. Defaults to false.')
});

const ArchiveProjectResponseSchema = z.object({
    id: z.number(),
    archived: z.boolean().optional(),
    name: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    project_id: z.string(),
    archived: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a project in GitLab.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedProjectId = input.project_id;

        if (input.archive) {
            // https://docs.gitlab.com/api/projects/#archive-a-project
            const response = await nango.post({
                endpoint: `/api/v4/projects/${encodedProjectId}/archive`,
                retries: 10
            });

            const providerProject = ArchiveProjectResponseSchema.parse(response.data);

            return {
                success: true,
                project_id: String(providerProject.id),
                archived: providerProject.archived ?? true,
                message: 'Project archived successfully.'
            };
        }

        // https://docs.gitlab.com/api/projects/#delete-project
        await nango.delete({
            endpoint: `/api/v4/projects/${encodedProjectId}`,
            retries: 10
        });

        return {
            success: true,
            project_id: input.project_id,
            archived: false,
            message: 'Project deleted successfully.'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
