import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        language: z.string().optional().describe('Filter leaders by programming language name. Example: "TypeScript".'),
        country_code: z.string().optional().describe('Filter leaders by two-character ISO 3166-1 alpha-2 country code. Example: "US".'),
        is_hireable: z.boolean().optional().describe('When true, only include leaders carrying the hireable badge.'),
        board_type: z
            .enum(['time', 'manual', 'ai', 'spend'])
            .optional()
            .describe(
                'Ranking type: "time" for hours coded, "manual" for hours coded excluding AI, "ai" for AI lines, or "spend" for AI spend. Defaults to "time".'
            ),
        page: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Leaderboard page number (1-based). Omitting it returns the page containing the authenticated user, or page 1 if they are not ranked.')
    })
    .describe("Filters for WakaTime's public global leaderboard.");

const ProviderCitySchema = z.object({
    name: z.string().nullable(),
    state: z.string().nullable(),
    country_code: z.string().nullable(),
    title: z.string().nullable()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    display_name: z.string().nullable(),
    username: z.string().nullable(),
    full_name: z.string().nullable(),
    website: z.string().nullable(),
    human_readable_website: z.string().nullable(),
    photo: z.string().nullable(),
    is_photo_public: z.boolean().nullable(),
    is_hireable: z.boolean().nullable(),
    is_pro: z.boolean().nullable(),
    city: ProviderCitySchema.nullable()
});

const ProviderLanguageSchema = z.object({
    name: z.string(),
    total_seconds: z.number(),
    ai_coding_seconds: z.number().nullable().optional(),
    manual_coding_seconds: z.number().nullable().optional()
});

const ProviderRunningTotalSchema = z.object({
    total_seconds: z.number(),
    human_readable_total: z.string(),
    daily_average: z.number(),
    human_readable_daily_average: z.string(),
    ai_model_total_cost: z.number().nullable().optional(),
    languages: z.array(ProviderLanguageSchema)
});

const ProviderLeaderSchema = z.object({
    rank: z.number(),
    running_total: ProviderRunningTotalSchema,
    user: ProviderUserSchema
});

const ProviderRangeSchema = z.object({
    start_date: z.string(),
    end_date: z.string(),
    text: z.string(),
    name: z.string()
});

const ProviderCurrentUserSchema = z.object({
    rank: z.number().nullable(),
    page: z.number().nullable(),
    user: ProviderUserSchema
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderLeaderSchema),
    page: z.number(),
    total_pages: z.number(),
    range: ProviderRangeSchema,
    language: z.string().nullable(),
    country_code: z.string().nullable(),
    is_hireable: z.boolean(),
    board_type: z.string(),
    modified_at: z.string(),
    current_user: ProviderCurrentUserSchema.nullable().optional()
});

const LeaderCitySchema = z.object({
    name: z.string().optional().describe('City name. Example: "San Francisco".'),
    state: z.string().optional().describe('State or region name. Example: "California".'),
    country_code: z.string().optional().describe('Two-character country code of the city. Example: "US".'),
    title: z.string().optional().describe('Human-readable city and region label. Example: "San Francisco, California".')
});

const LeaderUserSchema = z.object({
    id: z.string().describe('Unique WakaTime user ID.'),
    display_name: z.string().optional().describe('Public display name, falling back to the username or "Anonymous User".'),
    username: z.string().optional().describe('Public WakaTime username, when set.'),
    full_name: z.string().optional().describe('Full name of the user, when public.'),
    website: z.string().optional().describe('Website URL listed on the user profile, when set.'),
    human_readable_website: z.string().optional().describe('Website URL without a scheme, when set. Example: "example.com".'),
    photo: z.string().optional().describe('URL of the user profile photo.'),
    is_photo_public: z.boolean().optional().describe('Whether the user allows their photo to be shown publicly.'),
    is_hireable: z.boolean().optional().describe('Whether the user has the hireable badge.'),
    is_pro: z.boolean().optional().describe('Whether the user has a paid WakaTime subscription.'),
    city: LeaderCitySchema.optional().describe('City of the user, when public.')
});

const LeaderLanguageSchema = z.object({
    name: z.string().describe('Programming language name. Example: "TypeScript".'),
    total_seconds: z.number().describe('Total seconds the user coded in this language for the leaderboard range.'),
    ai_coding_seconds: z.number().optional().describe('Seconds attributed to AI coding in this language.'),
    manual_coding_seconds: z.number().optional().describe('Seconds manually typed in this language.')
});

const LeaderRunningTotalSchema = z.object({
    total_seconds: z.number().describe('Total coding seconds for the leaderboard range.'),
    human_readable_total: z.string().describe('Total coding time as a human-readable string. Example: "162 hrs 34 mins".'),
    daily_average: z.number().describe('Average coding seconds per day for the leaderboard range.'),
    human_readable_daily_average: z.string().describe('Average daily coding time as a human-readable string. Example: "3 hrs 12 mins".'),
    ai_model_total_cost: z.number().optional().describe('Estimated total AI spend in USD for the leaderboard range.'),
    languages: z.array(LeaderLanguageSchema).describe('Per-language coding totals for this leader.')
});

const LeaderSchema = z.object({
    rank: z.number().describe('Leaderboard rank, starting at 1 for the top leader.'),
    running_total: LeaderRunningTotalSchema.describe('Aggregated coding totals used to rank this leader.'),
    user: LeaderUserSchema.describe('Public profile of this leader.')
});

const LeaderboardRangeSchema = z.object({
    start_date: z.string().describe('Start date of the leaderboard range in YYYY-MM-DD format.'),
    end_date: z.string().describe('End date of the leaderboard range in YYYY-MM-DD format.'),
    text: z.string().describe('Human-readable description of the leaderboard range.'),
    name: z.string().describe('Machine-readable name of the range. Example: "last_7_days".')
});

const CurrentUserSchema = z.object({
    rank: z.number().optional().describe('Rank of the authenticated user, omitted when they are not on this leaderboard.'),
    page: z.number().optional().describe('Page containing the authenticated user, omitted when they are not on this leaderboard.'),
    user: LeaderUserSchema.describe('Public profile of the authenticated user.')
});

const OutputSchema = z
    .object({
        leaders: z.array(LeaderSchema).describe('Ranked leaderboard entries, highest coding activity first.'),
        page: z.number().describe('Current leaderboard page number (1-based).'),
        total_pages: z.number().describe('Total number of leaderboard pages available.'),
        range: LeaderboardRangeSchema.describe('Time range covered by this leaderboard.'),
        language: z.string().optional().describe('Language filter applied to this leaderboard, when set.'),
        country_code: z.string().optional().describe('Country code filter applied to this leaderboard, when set.'),
        is_hireable: z.boolean().describe('Whether the hireable badge filter is active for this leaderboard.'),
        board_type: z.string().describe('Ranking type of this leaderboard: "time", "manual", "ai", or "spend".'),
        modified_at: z.string().describe('Timestamp when this leaderboard data was last updated, in ISO 8601 format.'),
        current_user: CurrentUserSchema.optional().describe('Standing of the authenticated user on this leaderboard, when provided.')
    })
    .describe("A page of WakaTime's public global coding leaderboard.");

function mapUser(user: z.infer<typeof ProviderUserSchema>): z.infer<typeof LeaderUserSchema> {
    return {
        id: user.id,
        ...(user.display_name != null && { display_name: user.display_name }),
        ...(user.username != null && { username: user.username }),
        ...(user.full_name != null && { full_name: user.full_name }),
        ...(user.website != null && { website: user.website }),
        ...(user.human_readable_website != null && { human_readable_website: user.human_readable_website }),
        ...(user.photo != null && { photo: user.photo }),
        ...(user.is_photo_public != null && { is_photo_public: user.is_photo_public }),
        ...(user.is_hireable != null && { is_hireable: user.is_hireable }),
        ...(user.is_pro != null && { is_pro: user.is_pro }),
        ...(user.city != null && {
            city: {
                ...(user.city.name != null && { name: user.city.name }),
                ...(user.city.state != null && { state: user.city.state }),
                ...(user.city.country_code != null && { country_code: user.city.country_code }),
                ...(user.city.title != null && { title: user.city.title })
            }
        })
    };
}

/**
 * @tags: [read]
 * @tagReason: Fetches WakaTime's public global coding leaderboard without modifying any provider data.
 * @pitfalls: When authenticated, omitting `page` may return the page containing the current user rather than page 1, and the public leaderboard only refreshes about every 12 hours, so very recent activity may be missing.
 */
const action = createAction({
    description: "List WakaTime's public global coding leaderboard, optionally filtered by language, country, or hireable status.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://wakatime.com/developers#leaders
            endpoint: '/api/v1/leaders',
            params: {
                ...(input.language !== undefined && { language: input.language }),
                ...(input.country_code !== undefined && { country_code: input.country_code }),
                ...(input.is_hireable !== undefined && { is_hireable: String(input.is_hireable) }),
                ...(input.board_type !== undefined && { board_type: input.board_type }),
                ...(input.page !== undefined && { page: input.page })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            leaders: parsed.data.map((leader) => ({
                rank: leader.rank,
                running_total: {
                    total_seconds: leader.running_total.total_seconds,
                    human_readable_total: leader.running_total.human_readable_total,
                    daily_average: leader.running_total.daily_average,
                    human_readable_daily_average: leader.running_total.human_readable_daily_average,
                    ...(leader.running_total.ai_model_total_cost != null && { ai_model_total_cost: leader.running_total.ai_model_total_cost }),
                    languages: leader.running_total.languages.map((language) => ({
                        name: language.name,
                        total_seconds: language.total_seconds,
                        ...(language.ai_coding_seconds != null && { ai_coding_seconds: language.ai_coding_seconds }),
                        ...(language.manual_coding_seconds != null && { manual_coding_seconds: language.manual_coding_seconds })
                    }))
                },
                user: mapUser(leader.user)
            })),
            page: parsed.page,
            total_pages: parsed.total_pages,
            range: {
                start_date: parsed.range.start_date,
                end_date: parsed.range.end_date,
                text: parsed.range.text,
                name: parsed.range.name
            },
            ...(parsed.language != null && { language: parsed.language }),
            ...(parsed.country_code != null && { country_code: parsed.country_code }),
            is_hireable: parsed.is_hireable,
            board_type: parsed.board_type,
            modified_at: parsed.modified_at,
            ...(parsed.current_user != null && {
                current_user: {
                    ...(parsed.current_user.rank != null && { rank: parsed.current_user.rank }),
                    ...(parsed.current_user.page != null && { page: parsed.current_user.page }),
                    user: mapUser(parsed.current_user.user)
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
