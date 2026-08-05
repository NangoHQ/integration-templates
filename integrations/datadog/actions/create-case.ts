import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('Title of the case. Example: "Investigate high latency"'),
    priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5', 'NOT_DEFINED']).optional().describe('Priority of the case'),
    type_id: z.string().describe('UUID of the case type. Example: "00000000-0000-0000-0000-000000000001"'),
    project_id: z.string().describe('UUID of the project to create the case in. Example: "1f1cc8f1-7a6d-4eaf-be24-9e0f7f3da8ef"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        id: z.string(),
        type: z.string(),
        attributes: z
            .object({
                title: z.string(),
                priority: z.string().optional().nullable(),
                status: z.string().optional().nullable(),
                created_at: z.string().optional().nullable(),
                updated_at: z.string().optional().nullable()
            })
            .passthrough(),
        relationships: z
            .object({
                project: z
                    .object({
                        data: z.object({
                            id: z.string(),
                            type: z.string()
                        })
                    })
                    .optional()
            })
            .optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    priority: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    project_id: z.string().optional()
});

const action = createAction({
    description: 'Create a new case within a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/case-management/
            endpoint: 'v2/cases',
            data: {
                data: {
                    type: 'case',
                    attributes: {
                        title: input.title,
                        ...(input.priority !== undefined && { priority: input.priority }),
                        type_id: input.type_id
                    },
                    relationships: {
                        project: {
                            data: {
                                type: 'project',
                                id: input.project_id
                            }
                        }
                    }
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerCase = providerResponse.data;
        const attrs = providerCase.attributes;

        return {
            id: providerCase.id,
            type: providerCase.type,
            title: attrs.title,
            ...(attrs.priority != null && { priority: attrs.priority }),
            ...(attrs.status != null && { status: attrs.status }),
            ...(attrs.created_at != null && { created_at: attrs.created_at }),
            ...(attrs.updated_at != null && { updated_at: attrs.updated_at }),
            ...(providerCase.relationships?.project?.data?.id != null && { project_id: providerCase.relationships.project.data.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
