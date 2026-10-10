import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        language: z.string().optional().describe('Optional language name to filter the leaderboard by. Example: "TypeScript".'),
        country_code: z.string().optional().describe('Optional two-character country code to filter leaders by. Example: "US".'),
        board_type: z
            .enum(['time', 'manual', 'ai', 'spend'])
            .optional()
            .describe(
                'Optional ranking type: "time" (hours coded), "manual" (hours excluding AI), "ai" (AI lines), or "spend" (AI spend). Defaults to "time".'
            ),
        page: z.number().int().positive().optional().describe('Optional 1-based page number of the leaderboard to fetch.')
    })
    .describe('Optional filters for the leaderboard lookup, applied to whichever leaderboard is returned.');

const LeaderUserSchema = z.object({
    id: z.string().describe('Unique WakaTime user ID.'),
    display_name: z.string().nullable().describe('Display name shown on the leaderboard.'),
    username: z.string().nullable().describe('Public WakaTime username, if the user has one.'),
    full_name: z.string().nullable().describe('User full name, if the user made it public.'),
    website: z.string().nullable().optional().describe('Website URL from the user profile, if public.'),
    photo: z.string().nullable().optional().describe('URL of the user profile photo, if public.')
});

const RunningTotalSchema = z.object({
    total_seconds: z.number().nullable().optional().describe('Total coding activity in seconds for the leaderboard period.'),
    human_readable_total: z.string().nullable().optional().describe('Total coding activity as a human-readable string. Example: "12 hrs 34 mins".'),
    daily_average: z.number().nullable().optional().describe('Average coding activity per day in seconds.'),
    human_readable_daily_average: z.string().nullable().optional().describe('Average coding activity per day as a human-readable string.')
});

const LeaderEntrySchema = z.object({
    rank: z.number().int().nullable().describe('Rank on the leaderboard, or null if the user is unranked.'),
    user: LeaderUserSchema.describe('The ranked user.'),
    running_total: RunningTotalSchema.describe('Coding totals used to rank this user.')
});

const LeaderboardSchema = z.object({
    id: z.string().describe('Unique private leaderboard ID.'),
    name: z.string().describe('Private leaderboard display name.'),
    time_range: z.string().nullable().optional().describe('Time range the private leaderboard covers.'),
    members_count: z.number().int().nullable().optional().describe('Number of members in the private leaderboard.'),
    can_edit: z.boolean().nullable().optional().describe('Whether the current user can edit this leaderboard.'),
    can_delete: z.boolean().nullable().optional().describe('Whether the current user can delete this leaderboard.'),
    created_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the leaderboard was created.'),
    modified_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the leaderboard was last modified.')
});

const RangeSchema = z.object({
    name: z.string().nullable().optional(),
    text: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        source: z
            .enum(['private', 'public'])
            .describe('Which leaderboard was used: "private" when the account belongs to a private/team leaderboard, otherwise "public".'),
        leaderboard: LeaderboardSchema.optional().describe('Metadata for the private leaderboard; only present when source is "private".'),
        leaders: z.array(LeaderEntrySchema).describe('Ranked leaderboard entries, highest coding activity first.'),
        self_found: z.boolean().optional().describe('For public leaderboards: whether the authenticated user appears on the returned page.'),
        self_rank: z.number().int().nullable().optional().describe("For public leaderboards: the authenticated user's rank, or null if they are not ranked."),
        page: z.number().int().optional().describe('Current page number of the returned leaderboard.'),
        total_pages: z.number().int().optional().describe('Total number of pages available on the leaderboard.'),
        language: z.string().nullable().optional().describe('Language filter applied to the returned leaderboard, if any.'),
        board_type: z.string().nullable().optional().describe('Ranking type used by the returned leaderboard: time, manual, ai, or spend.'),
        range_name: z.string().nullable().optional().describe('Machine-readable name of the leaderboard time range. Example: "last_7_days".'),
        range_text: z.string().nullable().optional().describe('Human-readable description of the leaderboard time range.')
    })
    .describe(
        "The user's leaderboard standing: from a private (team) leaderboard when the account belongs to one, otherwise from the public global leaderboard."
    );

const PrivateBoardsResponseSchema = z.object({
    data: z.array(LeaderboardSchema),
    total: z.number().optional(),
    total_pages: z.number().optional()
});

const PrivateLeadersResponseSchema = z.object({
    data: z.array(LeaderEntrySchema),
    page: z.number().optional(),
    total_pages: z.number().optional(),
    language: z.string().nullable().optional(),
    country_code: z.string().nullable().optional(),
    board_type: z.string().nullable().optional(),
    range: RangeSchema.optional()
});

const PublicLeadersResponseSchema = z.object({
    data: z.array(LeaderEntrySchema),
    page: z.number().optional(),
    total_pages: z.number().optional(),
    language: z.string().nullable().optional(),
    board_type: z.string().nullable().optional(),
    range: RangeSchema.optional(),
    current_user: z
        .object({
            user: z.object({ id: z.string() }).passthrough(),
            rank: z.number().int().nullable().optional(),
            page: z.number().int().nullable().optional()
        })
        .nullable()
        .optional()
});

const CurrentUserResponseSchema = z.object({
    data: z.object({ id: z.string() }).passthrough()
});

/**
 * @tags: [read]
 * @tagReason: Only reads the account's private leaderboards, the public leaderboard, and the current user profile; it never mutates provider data.
 * @pitfalls: The public leaderboard refreshes only about every 12 hours, so its data can be stale; `self_found` reflects just the returned page, so when a specific page is requested it can be false even if the user is ranked - use `self_rank`, which is populated regardless of page.
 */
const action = createAction({
    description:
        'COMPOSITE: find out where this user ranks - checks their private (team) leaderboard first, and falls back to the public global leaderboard if they are not part of one.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params = {
            ...(input.language !== undefined && { language: input.language }),
            ...(input.country_code !== undefined && { country_code: input.country_code }),
            ...(input.board_type !== undefined && { board_type: input.board_type }),
            ...(input.page !== undefined && { page: input.page })
        };

        // https://wakatime.com/developers#private_leaderboards
        const boardsResponse = await nango.get({
            endpoint: '/api/v1/users/current/leaderboards',
            retries: 3
        });

        const boards = PrivateBoardsResponseSchema.parse(boardsResponse.data);
        const [firstBoard] = boards.data;

        if (firstBoard) {
            // https://wakatime.com/developers#private_leaderboards_leaders
            const boardLeadersResponse = await nango.get({
                endpoint: `/api/v1/users/current/leaderboards/${encodeURIComponent(firstBoard.id)}`,
                params,
                retries: 3
            });

            const boardLeaders = PrivateLeadersResponseSchema.parse(boardLeadersResponse.data);

            return {
                source: 'private',
                leaderboard: firstBoard,
                leaders: boardLeaders.data,
                ...(boardLeaders.page !== undefined && { page: boardLeaders.page }),
                ...(boardLeaders.total_pages !== undefined && { total_pages: boardLeaders.total_pages }),
                ...(boardLeaders.language != null && { language: boardLeaders.language }),
                ...(boardLeaders.board_type != null && { board_type: boardLeaders.board_type }),
                ...(boardLeaders.range?.name != null && { range_name: boardLeaders.range.name }),
                ...(boardLeaders.range?.text != null && { range_text: boardLeaders.range.text })
            };
        }

        // https://wakatime.com/developers#users
        const currentUserResponse = await nango.get({
            endpoint: '/api/v1/users/current',
            retries: 3
        });

        const currentUser = CurrentUserResponseSchema.parse(currentUserResponse.data);

        // https://wakatime.com/developers#leaders
        const leadersResponse = await nango.get({
            endpoint: '/api/v1/leaders',
            params,
            retries: 3
        });

        const publicLeaders = PublicLeadersResponseSchema.parse(leadersResponse.data);
        const selfId = currentUser.data.id;
        const selfFound = publicLeaders.data.some((entry) => entry.user.id === selfId);

        return {
            source: 'public',
            leaders: publicLeaders.data,
            self_found: selfFound,
            self_rank: publicLeaders.current_user?.rank ?? null,
            ...(publicLeaders.page !== undefined && { page: publicLeaders.page }),
            ...(publicLeaders.total_pages !== undefined && { total_pages: publicLeaders.total_pages }),
            ...(publicLeaders.language != null && { language: publicLeaders.language }),
            ...(publicLeaders.board_type != null && { board_type: publicLeaders.board_type }),
            ...(publicLeaders.range?.name != null && { range_name: publicLeaders.range.name }),
            ...(publicLeaders.range?.text != null && { range_text: publicLeaders.range.text })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
