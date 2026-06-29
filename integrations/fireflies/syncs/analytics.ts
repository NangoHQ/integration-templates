import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    last_end_time: z.string()
});

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const TeamSchema = z.record(z.string(), z.unknown()).nullable().optional();

const UserSchema = z.record(z.string(), z.unknown()).nullable().optional();

const AnalyticsSchema = z
    .object({
        team: TeamSchema,
        users: z.array(UserSchema).nullable().optional()
    })
    .passthrough();

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            analytics: z.union([AnalyticsSchema, z.null()]).optional()
        })
        .optional(),
    errors: z.array(z.record(z.string(), z.unknown())).optional()
});

const AnalyticsRecordSchema = z.object({
    id: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    team: z.record(z.string(), z.unknown()).optional(),
    users: z.array(z.record(z.string(), z.unknown())).optional()
});

const sync = createSync({
    description: 'Sync conversation analytics for rolling date windows',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/analytics' }],
    checkpoint: CheckpointSchema,
    models: {
        Analytics: AnalyticsRecordSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw != null ? CheckpointSchema.parse(checkpointRaw) : undefined;

        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);
        let currentStartTime = checkpoint?.last_end_time ? new Date(checkpoint.last_end_time) : thirtyDaysAgo;

        const query = `
            query Analytics($startTime: String, $endTime: String) {
                analytics(start_time: $startTime, end_time: $endTime) {
                    team {
                        conversation {
                            average_filler_words
                            average_filler_words_diff_pct
                            average_monologues_count
                            average_monologues_count_diff_pct
                            average_questions
                            average_questions_diff_pct
                            average_sentiments {
                                negative_pct
                                neutral_pct
                                positive_pct
                            }
                            average_silence_duration
                            average_silence_duration_diff_pct
                            average_talk_listen_ratio
                            average_words_per_minute
                            longest_monologue_duration_sec
                            longest_monologue_duration_diff_pct
                            total_filler_words
                            total_filler_words_diff_pct
                            total_meeting_notes_count
                            total_meetings_count
                            total_monologues_count
                            total_monologues_diff_pct
                            teammates_count
                            total_questions
                            total_questions_diff_pct
                            total_silence_duration
                            total_silence_duration_diff_pct
                        }
                        meeting {
                            count
                            count_diff_pct
                            duration
                            duration_diff_pct
                            average_count
                            average_count_diff_pct
                            average_duration
                            average_duration_diff_pct
                        }
                    }
                    users {
                        user_id
                        user_name
                        user_email
                        conversation {
                            talk_listen_pct
                            talk_listen_ratio
                            total_silence_duration
                            total_silence_duration_compare_to
                            total_silence_pct
                            total_silence_ratio
                            total_speak_duration
                            total_speak_duration_with_user
                            total_word_count
                            user_filler_words
                            user_filler_words_compare_to
                            user_filler_words_diff_pct
                            user_longest_monologue_sec
                            user_longest_monologue_compare_to
                            user_longest_monologue_diff_pct
                            user_monologues_count
                            user_monologues_count_compare_to
                            user_monologues_count_diff_pct
                            user_questions
                            user_questions_compare_to
                            user_questions_diff_pct
                            user_speak_duration
                            user_word_count
                            user_words_per_minute
                            user_words_per_minute_compare_to
                            user_words_per_minute_diff_pct
                        }
                        meeting {
                            count
                            count_diff
                            count_diff_compared_to
                            count_diff_pct
                            duration
                            duration_diff
                            duration_diff_compared_to
                            duration_diff_pct
                        }
                    }
                }
            }
        `;

        while (currentStartTime.getTime() < now.getTime()) {
            const startTimeIso = currentStartTime.toISOString();
            const endTime = new Date(Math.min(currentStartTime.getTime() + SEVEN_DAYS_MS, now.getTime()));
            const endTimeIso = endTime.toISOString();

            const proxyConfig: ProxyConfiguration = {
                // https://docs.fireflies.ai/graphql-api/query/analytics
                endpoint: '/graphql',
                method: 'POST',
                data: {
                    query,
                    variables: {
                        startTime: startTimeIso,
                        endTime: endTimeIso
                    }
                },
                retries: 3
            };

            const response = await nango.post(proxyConfig);
            const parsedResponse = GraphQLResponseSchema.parse(response.data);

            if (parsedResponse.errors && parsedResponse.errors.length > 0) {
                const errorMessages = parsedResponse.errors.map((e) => String(e['message'] || e['code'] || JSON.stringify(e))).join(', ');
                throw new Error(`Fireflies analytics query failed: ${errorMessages}`);
            }

            const analytics = parsedResponse.data?.analytics;
            if (analytics == null) {
                throw new Error('Fireflies analytics query returned no analytics data');
            }

            const id = `${startTimeIso}_${endTimeIso}`;
            const record = {
                id,
                start_time: startTimeIso,
                end_time: endTimeIso,
                ...(analytics.team && { team: analytics.team }),
                ...(analytics.users && { users: analytics.users })
            };

            await nango.batchSave([record], 'Analytics');
            await nango.saveCheckpoint({ last_end_time: endTimeIso });
            currentStartTime = endTime;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
