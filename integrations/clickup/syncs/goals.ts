import { createSync } from 'nango';
import * as z from 'zod';

// https://developer.clickup.com/reference/getgoals
// key_results and history are omitted from schema as they are not included in output model
const ClickUpGoalSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        color: z.string().nullish(),
        date_created: z.string(),
        date_updated: z.string(),
        creator: z.number(),
        team_id: z.string(),
        pretty_id: z.string().nullish(),
        archived: z.boolean().nullish(),
        description: z.string().nullish(),
        multiple_owners: z.boolean().nullish(),
        due_date: z.string().nullish(),
        start_date: z.string().nullish(),
        folder_id: z.string().nullish(),
        members: z.array(z.number()),
        owners: z.array(z.number()),
        percent_completed: z.number().nullish(),
        pretty_url: z.string().nullish()
    })
    .passthrough();

type ClickUpGoal = z.infer<typeof ClickUpGoalSchema>;

const GoalSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullish(),
    date_created: z.string(),
    date_updated: z.string(),
    creator: z.number(),
    team_id: z.string(),
    pretty_id: z.string().nullish(),
    archived: z.boolean().nullish(),
    description: z.string().nullish(),
    multiple_owners: z.boolean().nullish(),
    due_date: z.string().nullish(),
    start_date: z.string().nullish(),
    folder_id: z.string().nullish(),
    members: z.array(z.number()),
    owners: z.array(z.number()),
    percent_completed: z.number().nullish(),
    pretty_url: z.string().nullish()
});

const MetadataSchema = z.object({
    team_id: z.string()
});

const sync = createSync({
    description: 'Sync goals from ClickUp',
    version: '1.0.0',
    endpoints: [{ path: '/syncs/goals', method: 'GET' }],
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    models: {
        Goal: GoalSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();

        if (!metadata?.team_id) {
            await nango.log('Missing team_id in metadata, cannot sync goals');
            return;
        }

        const teamId = metadata.team_id;

        // ClickUp returns the full goal collection and does not expose a
        // changed-since filter. Keep this as a full refresh so deletion
        // tracking remains correct.
        await nango.trackDeletesStart('Goal');

        // https://developer.clickup.com/reference/getgoals
        const response = await nango.get({
            endpoint: `/api/v2/team/${encodeURIComponent(teamId)}/goal`,
            retries: 3
        });

        const responseData = response.data;
        if (!responseData || typeof responseData !== 'object') {
            throw new Error('Invalid response from ClickUp goals API');
        }

        if (!('goals' in responseData)) {
            throw new Error('Goals property not found in response');
        }

        const goalsArray = responseData.goals;
        if (!Array.isArray(goalsArray)) {
            throw new Error('Goals is not an array in response');
        }

        const validatedGoals: ClickUpGoal[] = [];
        for (const goal of goalsArray) {
            const parseResult = ClickUpGoalSchema.safeParse(goal);
            if (parseResult.success) {
                validatedGoals.push(parseResult.data);
            } else {
                await nango.log(`Failed to parse goal: ${parseResult.error.message}`);
                throw new Error(`Goal validation failed: ${parseResult.error.message}`);
            }
        }

        // Map to our output model
        const goalsToSave = validatedGoals.map((goal) => ({
            id: goal.id,
            name: goal.name,
            color: goal.color,
            date_created: goal.date_created,
            date_updated: goal.date_updated,
            creator: goal.creator,
            team_id: goal.team_id,
            pretty_id: goal.pretty_id,
            archived: goal.archived,
            description: goal.description,
            multiple_owners: goal.multiple_owners,
            due_date: goal.due_date,
            start_date: goal.start_date,
            folder_id: goal.folder_id,
            members: goal.members,
            owners: goal.owners,
            percent_completed: goal.percent_completed,
            pretty_url: goal.pretty_url
        }));

        if (goalsToSave.length > 0) {
            await nango.batchSave(goalsToSave, 'Goal');
        }

        await nango.trackDeletesEnd('Goal');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
