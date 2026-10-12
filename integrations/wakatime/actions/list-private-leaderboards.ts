import { z } from 'zod';
import { createAction } from 'nango';

const LeaderboardSchema = z.object({
    id: z.string().describe('Unique id of the private leaderboard.'),
    name: z.string().describe('Display name of the private leaderboard.'),
    can_delete: z.boolean().describe('True if the current user has access to delete this leaderboard.'),
    can_edit: z.boolean().describe('True if the current user has access to edit this leaderboard.'),
    has_available_seat: z.boolean().describe('True if this leaderboard has room for more members.'),
    members_count: z.number().describe('Number of members in this private leaderboard.'),
    members_with_timezones_count: z.number().describe('Number of members who have a timezone set; members without a timezone are hidden from leaderboards.'),
    time_range: z.string().describe('Time range of this leaderboard; always "last_7_days".'),
    created_at: z.string().describe('ISO 8601 timestamp when the leaderboard was created.'),
    modified_at: z.string().describe('ISO 8601 timestamp when the leaderboard was last modified.')
});

const InputSchema = z
    .object({
        page: z.number().int().positive().optional().describe('Page number of results to return, starting at 1. Omit for the first page.')
    })
    .describe('Filters for listing the private leaderboards the current user belongs to.');

const OutputSchema = z
    .object({
        leaderboards: z.array(LeaderboardSchema).describe('Private leaderboards the authenticated user belongs to.'),
        page: z.number().optional().describe('Current page number of the returned results.'),
        total_pages: z.number().optional().describe('Total number of pages of available results.')
    })
    .describe('Private leaderboards the current user belongs to.');

const ProviderResponseSchema = z.object({
    data: z.array(LeaderboardSchema),
    page: z.number().optional(),
    total_pages: z.number().optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads the list of private leaderboards the user belongs to without modifying any provider data.
 * @pitfalls: An account that belongs to no private leaderboard receives an empty list rather than an error, so an empty result does not mean the request failed.
 */
const action = createAction({
    description: 'List the private leaderboards (team/custom leaderboards) this user belongs to.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_private_leaderboards'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://wakatime.com/developers#private_leaderboards
            endpoint: '/api/v1/users/current/leaderboards',
            params: {
                ...(input.page !== undefined && { page: input.page })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            leaderboards: parsed.data,
            ...(parsed.page !== undefined && { page: parsed.page }),
            ...(parsed.total_pages !== undefined && { total_pages: parsed.total_pages })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
