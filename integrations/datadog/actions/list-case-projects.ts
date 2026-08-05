import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProjectAttributesSchema = z.object({
    key: z.string(),
    name: z.string()
});

const ProjectSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: ProjectAttributesSchema,
    relationships: z.unknown().optional()
});

const ListResponseSchema = z.object({
    data: z.array(ProjectSchema)
});

const OutputItemSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    name: z.string().optional(),
    key: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List case-management projects (containers for cases, similar in spirit to a Jira project).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['cases_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/case-management/#list-projects
            endpoint: 'v2/cases/projects',
            params: {
                ...(input.cursor !== undefined && { 'page[cursor]': input.cursor })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Received an empty response from the Datadog API.'
            });
        }

        const body = ListResponseSchema.parse(response.data);

        return {
            items: body.data.map((project) => ({
                id: project.id,
                type: project.type,
                name: project.attributes.name,
                key: project.attributes.key
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
