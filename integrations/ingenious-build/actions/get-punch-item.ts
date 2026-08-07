import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Punch item ID. Example: "6a71dffecb6ddf6b370e0a9f"')
});

const OutputSchema = z.object({
    id: z.string(),
    project_id: z.string().nullable().optional(),
    punch_list_id: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    stamp_id: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    comment: z.string().nullable().optional(),
    originator_id: z.string().nullable().optional(),
    ball_in_court_id: z.string().nullable().optional()
});

const action = createAction({
    description: 'Get a single punch item by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.ingenious.build/reference/getpunchitempubv2.md
            endpoint: `/api/v2/pub/punch-items/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Punch item not found',
                id: input.id
            });
        }

        const providerPunchItem = z
            .object({
                id: z.string(),
                project_id: z.string().nullable().optional(),
                punch_list_id: z.string().nullable().optional(),
                status: z.string().nullable().optional(),
                stamp_id: z.string().nullable().optional(),
                title: z.string().nullable().optional(),
                due_date: z.string().nullable().optional(),
                comment: z.string().nullable().optional(),
                originator_id: z.string().nullable().optional(),
                ball_in_court_id: z.string().nullable().optional()
            })
            .parse(response.data);

        return {
            id: providerPunchItem.id,
            ...(providerPunchItem.project_id !== undefined && { project_id: providerPunchItem.project_id }),
            ...(providerPunchItem.punch_list_id !== undefined && { punch_list_id: providerPunchItem.punch_list_id }),
            ...(providerPunchItem.status !== undefined && { status: providerPunchItem.status }),
            ...(providerPunchItem.stamp_id !== undefined && { stamp_id: providerPunchItem.stamp_id }),
            ...(providerPunchItem.title !== undefined && { title: providerPunchItem.title }),
            ...(providerPunchItem.due_date !== undefined && { due_date: providerPunchItem.due_date }),
            ...(providerPunchItem.comment !== undefined && { comment: providerPunchItem.comment }),
            ...(providerPunchItem.originator_id !== undefined && { originator_id: providerPunchItem.originator_id }),
            ...(providerPunchItem.ball_in_court_id !== undefined && { ball_in_court_id: providerPunchItem.ball_in_court_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
