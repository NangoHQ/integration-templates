import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().min(1).describe('Globally unique identifier for the project. Example: "12345"'),
    name: z.string().describe('The text to be displayed as the section name. This cannot be an empty string. Example: "Next Actions"'),
    insert_before: z
        .string()
        .optional()
        .describe('An existing section within this project before which the added section should be inserted. Cannot be provided together with insert_after.'),
    insert_after: z
        .string()
        .optional()
        .describe('An existing section within this project after which the added section should be inserted. Cannot be provided together with insert_before.')
});

const ProjectCompactSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional()
});

const ProviderSectionSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    created_at: z.string().optional().nullable(),
    project: ProjectCompactSchema.optional().nullable(),
    projects: z.array(ProjectCompactSchema).optional().nullable()
});

const ProviderResponseSchema = z.object({
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
    description: 'Create a section in a project.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-section',
        group: 'Sections'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.asana.com/reference/createsectionforproject
            endpoint: `/api/1.0/projects/${encodeURIComponent(input.project_id)}/sections`,
            data: {
                data: {
                    name: input.name,
                    ...(input.insert_before !== undefined && { insert_before: input.insert_before }),
                    ...(input.insert_after !== undefined && { insert_after: input.insert_after })
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const section = providerResponse.data;

        return {
            gid: section.gid,
            resource_type: section.resource_type,
            name: section.name,
            ...(section.created_at != null && { created_at: section.created_at }),
            ...(section.project != null && { project: section.project }),
            ...(section.projects != null && { projects: section.projects })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
