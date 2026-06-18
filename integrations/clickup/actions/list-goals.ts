import { z } from 'zod';
import { createAction } from 'nango';

const ProviderGoalSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        team_id: z.string(),
        color: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        creator: z.number(),
        date_created: z.string().nullable().optional(),
        date_updated: z.string().nullable().optional(),
        date_closed: z.string().nullable().optional(),
        archived: z.boolean().nullable().optional(),
        multiple_owners: z.boolean().nullable().optional(),
        watchers: z.array(z.number()).nullable().optional(),
        owners: z.array(z.number()).nullable().optional(),
        key_results: z.array(z.unknown()).nullable().optional(),
        percent_completed: z.number().nullable().optional(),
        folder_id: z.string().nullable().optional(),
        type: z.enum(['number', 'currency', 'boolean', 'percentage']).nullable().optional()
    })
    .passthrough();

const ProviderFolderSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        team_id: z.string(),
        creator: z.number(),
        date_created: z.string().nullable().optional(),
        date_updated: z.string().nullable().optional(),
        archived: z.boolean().nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    goals: z.array(ProviderGoalSchema),
    folders: z.array(ProviderFolderSchema)
});

const GoalSchema = z.object({
    id: z.string(),
    name: z.string(),
    team_id: z.string(),
    color: z.string().optional(),
    description: z.string().optional(),
    creator: z.number(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    date_closed: z.string().optional(),
    archived: z.boolean().optional(),
    multiple_owners: z.boolean().optional(),
    watchers: z.array(z.number()).optional(),
    owners: z.array(z.number()).optional(),
    key_results: z.array(z.unknown()).optional(),
    percent_completed: z.number().optional(),
    folder_id: z.string().optional(),
    type: z.enum(['number', 'currency', 'boolean', 'percentage']).optional()
});

const FolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    team_id: z.string(),
    creator: z.number(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    archived: z.boolean().optional()
});

const InputSchema = z.object({
    team_id: z.string().describe('ClickUp team/workspace ID. Example: "90152560096"')
});

const OutputSchema = z.object({
    goals: z.array(GoalSchema),
    folders: z.array(FolderSchema)
});

const action = createAction({
    description: 'List goals from ClickUp',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.clickup.com/reference/getgoals
        const response = await nango.get({
            endpoint: `/api/v2/team/${encodeURIComponent(input.team_id)}/goal`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            goals: providerData.goals.map((goal) => ({
                id: goal.id,
                name: goal.name,
                team_id: goal.team_id,
                creator: goal.creator,
                ...(goal.color != null && { color: goal.color }),
                ...(goal.description != null && { description: goal.description }),
                ...(goal.date_created != null && { date_created: goal.date_created }),
                ...(goal.date_updated != null && { date_updated: goal.date_updated }),
                ...(goal.date_closed != null && { date_closed: goal.date_closed }),
                ...(goal.archived != null && { archived: goal.archived }),
                ...(goal.multiple_owners != null && { multiple_owners: goal.multiple_owners }),
                ...(goal.watchers != null && { watchers: goal.watchers }),
                ...(goal.owners != null && { owners: goal.owners }),
                ...(goal.key_results != null && { key_results: goal.key_results }),
                ...(goal.percent_completed != null && { percent_completed: goal.percent_completed }),
                ...(goal.folder_id != null && { folder_id: goal.folder_id }),
                ...(goal.type != null && { type: goal.type })
            })),
            folders: providerData.folders.map((folder) => ({
                id: folder.id,
                name: folder.name,
                team_id: folder.team_id,
                creator: folder.creator,
                ...(folder.date_created != null && { date_created: folder.date_created }),
                ...(folder.date_updated != null && { date_updated: folder.date_updated }),
                ...(folder.archived != null && { archived: folder.archived })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
