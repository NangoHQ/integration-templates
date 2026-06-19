import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    section_gid: z.string().min(1).describe('The globally unique identifier for the section. Example: "12345"')
});

const ProjectCompactSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string()
});

const ProviderSectionSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    created_at: z.string().optional(),
    project: ProjectCompactSchema.optional(),
    projects: z.array(ProjectCompactSchema).optional()
});

const AsanaResponseSchema = z.object({
    data: ProviderSectionSchema
});

const OutputSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    created_at: z.string().optional(),
    project: ProjectCompactSchema.optional(),
    projects: z.array(ProjectCompactSchema).optional()
});

const action = createAction({
    description: 'Fetch a single section by gid.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.asana.com/reference/getsection
            endpoint: `/api/1.0/sections/${encodeURIComponent(input.section_gid)}`,
            params: {
                opt_fields: 'created_at,project,projects,name'
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Section not found',
                section_gid: input.section_gid
            });
        }

        const providerResponse = AsanaResponseSchema.parse(response.data);
        const section = providerResponse.data;

        return {
            gid: section.gid,
            resource_type: section.resource_type,
            name: section.name,
            ...(section.created_at !== undefined && { created_at: section.created_at }),
            ...(section.project !== undefined && { project: section.project }),
            ...(section.projects !== undefined && { projects: section.projects })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
