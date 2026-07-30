import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.number().describe('Organization ID. Example: 775646'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProjectSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        status: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    projects: z.array(z.unknown()),
    pagination: z
        .object({
            next_page_start_id: z.union([z.string(), z.number()]).optional()
        })
        .optional()
});

const OutputSchema = z.object({
    projects: z.array(ProjectSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List projects in an organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hubstaff:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.hubstaff.com/
            endpoint: `v2/organizations/${encodeURIComponent(String(input.organization_id))}/projects`,
            params: {
                ...(input.cursor !== undefined && { page_start_id: input.cursor })
            },
            retries: 3
        });

        const data = ProviderResponseSchema.parse(response.data);

        return {
            projects: data.projects.map((project: unknown) => ProjectSchema.parse(project)),
            ...(data.pagination?.next_page_start_id !== undefined && { next_cursor: String(data.pagination.next_page_start_id) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
