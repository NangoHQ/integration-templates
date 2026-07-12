import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    story_public_id: z.number().describe('The story public ID to add the task to. Example: 35'),
    description: z.string().describe('The task description. Example: "Review design mockups"'),
    complete: z.boolean().optional().describe('Whether the task is complete. Defaults to false.'),
    owner_ids: z.array(z.string()).optional().describe('UUIDs of members to assign as owners. Example: ["6a53bda8-4df3-4862-baf5-bf953f932636"]')
});

const ProviderTaskSchema = z.object({
    id: z.number(),
    description: z.string(),
    story_id: z.number(),
    complete: z.boolean().optional(),
    owner_ids: z.array(z.string()).optional(),
    position: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number().describe('The created task ID.'),
    description: z.string().describe('The task description.'),
    story_id: z.number().describe('The parent story public ID.'),
    complete: z.boolean().optional().describe('Whether the task is complete.'),
    owner_ids: z.array(z.string()).optional().describe('UUIDs of assigned owner members.'),
    position: z.number().optional().describe('The task position within the story.'),
    created_at: z.string().optional().describe('ISO 8601 creation timestamp.'),
    updated_at: z.string().optional().describe('ISO 8601 update timestamp.')
});

const action = createAction({
    description: 'Add a checklist task to a story',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.shortcut.com/api/rest/v3#Create-Task
            endpoint: `/api/v3/stories/${encodeURIComponent(input.story_public_id)}/tasks`,
            data: {
                description: input.description,
                ...(input.complete !== undefined && { complete: input.complete }),
                ...(input.owner_ids !== undefined && { owner_ids: input.owner_ids })
            },
            retries: 3
        });

        const providerTask = ProviderTaskSchema.parse(response.data);

        return {
            id: providerTask.id,
            description: providerTask.description,
            story_id: providerTask.story_id,
            ...(providerTask.complete !== undefined && { complete: providerTask.complete }),
            ...(providerTask.owner_ids !== undefined && { owner_ids: providerTask.owner_ids }),
            ...(providerTask.position !== undefined && { position: providerTask.position }),
            ...(providerTask.created_at !== undefined && { created_at: providerTask.created_at }),
            ...(providerTask.updated_at !== undefined && { updated_at: providerTask.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
