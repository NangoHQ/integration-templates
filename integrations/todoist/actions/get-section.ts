import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    section_id: z.string().describe('The ID of the section to retrieve. Example: "6h78Pcqxgv66G2rq"')
});

const ProviderSectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    project_id: z.string(),
    user_id: z.string(),
    section_order: z.number(),
    is_collapsed: z.boolean(),
    is_deleted: z.boolean(),
    is_archived: z.boolean(),
    archived_at: z.string().nullable().optional(),
    added_at: z.string(),
    updated_at: z.string(),
    goal_ids: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    project_id: z.string(),
    user_id: z.string(),
    section_order: z.number(),
    is_collapsed: z.boolean(),
    is_deleted: z.boolean(),
    is_archived: z.boolean(),
    archived_at: z.string().optional(),
    added_at: z.string(),
    updated_at: z.string(),
    goal_ids: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Retrieve a single section.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.todoist.com/api/v1/#tag/Sections/operation/getGetSection
            endpoint: `/api/v1/sections/${encodeURIComponent(input.section_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Section not found',
                section_id: input.section_id
            });
        }

        const providerSection = ProviderSectionSchema.parse(response.data);

        return {
            id: providerSection.id,
            name: providerSection.name,
            ...(providerSection.description != null && { description: providerSection.description }),
            project_id: providerSection.project_id,
            user_id: providerSection.user_id,
            section_order: providerSection.section_order,
            is_collapsed: providerSection.is_collapsed,
            is_deleted: providerSection.is_deleted,
            is_archived: providerSection.is_archived,
            ...(providerSection.archived_at != null && { archived_at: providerSection.archived_at }),
            added_at: providerSection.added_at,
            updated_at: providerSection.updated_at,
            ...(providerSection.goal_ids !== undefined && { goal_ids: providerSection.goal_ids })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
