import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('Project ID. Example: "6a71de59f55241acad0cd44e"'),
    title: z.string().describe('Title of the punch item. Example: "Nango Registry Test Punch Item"'),
    status: z
        .enum(['NOT_STARTED', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'ARCHIVED'])
        .describe('Status of the punch item. Valid values: NOT_STARTED, IN_PROGRESS, UNDER_REVIEW, COMPLETED, ARCHIVED'),
    due_date: z.string().describe('Due date in ISO-8601 format with a literal Z suffix. Example: "2026-08-18T00:00:00Z"')
});

const OutputSchema = z.object({
    id: z.string().describe('ID of the created punch item. Example: "6a71dffe..."')
});

const action = createAction({
    description: 'Create a new punch item on a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.ingenious.build/reference/createpunchitempubv2
            endpoint: '/api/v2/pub/punch-items',
            data: {
                project_id: input.project_id,
                title: input.title,
                status: input.status,
                due_date: input.due_date
            },
            // No provider-supported idempotency key exists for this endpoint. A single write
            // retry (the same convention used by other Ingenious Build create actions) bounds
            // the risk of creating a duplicate punch item on a transient failure.
            retries: 1
        });

        const id = z.string().parse(response.data);

        return {
            id: id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
