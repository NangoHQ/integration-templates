import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    shortcode: z.string().describe('The job\'s shortcode. Example: "9CD658E13E"'),
    limit: z.number().optional().describe('Number of activities to retrieve per page. Default: 50, Max: 100.'),
    since_id: z.string().optional().describe('Returns results with an ID greater than or equal to the specified ID.'),
    max_id: z.string().optional().describe('Returns results with an ID less than or equal to the specified ID.')
});

const ActivitySchema = z
    .object({
        action: z.string(),
        stage_name: z.string().nullable().optional(),
        created_at: z.string(),
        candidate: z
            .object({
                id: z.string(),
                name: z.string()
            })
            .optional(),
        member: z
            .object({
                id: z.string(),
                name: z.string()
            })
            .optional(),
        body: z.string().nullable().optional(),
        rating: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const PagingSchema = z.object({
    next: z.string().optional()
});

const OutputSchema = z.object({
    activities: z.array(ActivitySchema),
    paging: PagingSchema.optional()
});

const action = createAction({
    description: "List a job's activity stream (opens, applications, closures)",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workable.readme.io/reference/job-activities
            endpoint: `/spi/v3/jobs/${encodeURIComponent(input.shortcode)}/activities`,
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.since_id !== undefined && { since_id: input.since_id }),
                ...(input.max_id !== undefined && { max_id: input.max_id })
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
