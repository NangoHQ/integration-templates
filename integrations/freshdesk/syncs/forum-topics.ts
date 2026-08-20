import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const ForumSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    position: z.number().nullable().optional(),
    forum_category_id: z.number(),
    forum_type: z.number().nullable().optional(),
    forum_visibility: z.number().nullable().optional(),
    topics_count: z.number().nullable().optional(),
    posts_count: z.number().nullable().optional(),
    company_ids: z.array(z.number()).nullable().optional()
});

const TopicSchema = z.object({
    id: z.number(),
    title: z.string(),
    forum_id: z.number(),
    user_id: z.number(),
    locked: z.boolean().nullable().optional(),
    published: z.boolean().nullable().optional(),
    stamp_type: z.number().nullable().optional(),
    replied_by: z.number().nullable().optional(),
    posts_count: z.number().nullable().optional(),
    hits: z.number().nullable().optional(),
    user_votes: z.number().nullable().optional(),
    merged_topic_id: z.number().nullable().optional(),
    sticky: z.boolean().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    replied_at: z.string().nullable().optional()
});

const ForumTopicSchema = z
    .object({
        id: z.string().describe('Unique identifier of the forum topic as a stable string.'),
        title: z.string().describe('Title of the forum topic.'),
        forum_id: z.number().describe('ID of the forum this topic belongs to.'),
        forum_name: z.string().optional().describe('Name of the forum this topic belongs to.'),
        category_id: z.number().describe('ID of the discussion category containing this topic.'),
        category_name: z.string().optional().describe('Name of the discussion category containing this topic.'),
        user_id: z.number().describe('ID of the user who created the topic.'),
        locked: z.boolean().describe('Whether the topic is locked so no more posts can be added.'),
        published: z.boolean().describe('Whether the topic is published and visible.'),
        stamp_type: z.number().optional().describe('Stamp type on the topic indicating status such as answered or solved.'),
        replied_by: z.number().optional().describe('User ID of the agent or user who last replied to the topic.'),
        posts_count: z.number().describe('Number of posts and replies in the topic.'),
        hits: z.number().describe('Number of views the topic has received.'),
        user_votes: z.number().describe('Number of votes the topic has received from users.'),
        merged_topic_id: z.number().optional().describe('ID of the topic this topic was merged into, if any.'),
        sticky: z.boolean().describe('Whether the topic is pinned to the top of the forum.'),
        created_at: z.string().describe('ISO 8601 timestamp when the topic was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the topic was last updated.'),
        replied_at: z.string().optional().describe('ISO 8601 timestamp of the most recent reply.')
    })
    .describe('A discussion topic within a Freshdesk forum, including its parent forum and category context.');

const CheckpointSchema = z
    .object({
        forum_id: z.number().int().describe('ID of the forum whose topics were being processed when the sync was interrupted; zero means no resume point.'),
        topic_page: z.number().int().positive().describe('Next page of topics to resume fetching for the interrupted forum.')
    })
    .describe('Checkpoint for resuming the forum topics full refresh sync across nested category, forum, and topic pagination.');

const sync = createSync({
    description:
        'Recursively fetches discussion forum topics from Freshdesk (categories -> forums -> topics), mirroring the categories -> folders -> articles traversal used by the articles sync.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ForumTopic: ForumTopicSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint ?? { forum_id: 0, topic_page: 1 });
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : { forum_id: 0, topic_page: 1 };

        const allCategories: Array<z.infer<typeof CategorySchema>> = [];
        const categoriesConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#discussions
            endpoint: '/api/v2/discussions/categories',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        for await (const rawCategories of nango.paginate(categoriesConfig)) {
            const parsed = z.array(CategorySchema).safeParse(rawCategories);
            if (!parsed.success) {
                throw new Error(`Failed to parse categories response: ${parsed.error.message}`);
            }
            allCategories.push(...parsed.data);
        }

        type ForumContext = z.infer<typeof ForumSchema> & {
            category_name: string;
            category_id: number;
        };

        const allForums: Array<ForumContext> = [];
        for (const category of allCategories) {
            const forumsConfig: ProxyConfiguration = {
                // https://developers.freshdesk.com/api/#discussions
                endpoint: `/api/v2/discussions/categories/${encodeURIComponent(String(category.id))}/forums`,
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'per_page',
                    limit: 100
                },
                retries: 3
            };

            for await (const rawForums of nango.paginate(forumsConfig)) {
                const parsed = z.array(ForumSchema).safeParse(rawForums);
                if (!parsed.success) {
                    throw new Error(`Failed to parse forums response: ${parsed.error.message}`);
                }
                allForums.push(
                    ...parsed.data.map((forum) => ({
                        ...forum,
                        category_name: category.name,
                        category_id: category.id
                    }))
                );
            }
        }

        let resumeForumId = checkpoint.forum_id === 0 ? undefined : checkpoint.forum_id;
        let resumeTopicPage = checkpoint.forum_id === 0 ? undefined : checkpoint.topic_page;

        if (resumeForumId && !allForums.some((f) => f.id === resumeForumId)) {
            resumeForumId = undefined;
            resumeTopicPage = undefined;
        }

        await nango.trackDeletesStart('ForumTopic');

        let reachedResumePoint = !resumeForumId;

        for (const forum of allForums) {
            if (!reachedResumePoint) {
                if (forum.id === resumeForumId) {
                    reachedResumePoint = true;
                } else {
                    continue;
                }
            }

            let nextTopicPage = forum.id === resumeForumId ? (resumeTopicPage ?? 1) : 1;

            const topicsConfig: ProxyConfiguration = {
                // https://developers.freshdesk.com/api/#discussions
                endpoint: `/api/v2/discussions/forums/${encodeURIComponent(String(forum.id))}/topics`,
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: nextTopicPage,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'per_page',
                    limit: 100
                },
                retries: 3
            };

            for await (const rawTopics of nango.paginate(topicsConfig)) {
                const parsed = z.array(TopicSchema).safeParse(rawTopics);
                if (!parsed.success) {
                    throw new Error(`Failed to parse topics response: ${parsed.error.message}`);
                }

                const topics = parsed.data.map((topic) => ({
                    id: String(topic.id),
                    title: topic.title,
                    forum_id: topic.forum_id,
                    forum_name: forum.name,
                    category_id: forum.category_id,
                    category_name: forum.category_name,
                    user_id: topic.user_id,
                    locked: topic.locked ?? false,
                    published: topic.published ?? false,
                    ...(topic.stamp_type != null && { stamp_type: topic.stamp_type }),
                    ...(topic.replied_by != null && { replied_by: topic.replied_by }),
                    posts_count: topic.posts_count ?? 0,
                    hits: topic.hits ?? 0,
                    user_votes: topic.user_votes ?? 0,
                    ...(topic.merged_topic_id != null && { merged_topic_id: topic.merged_topic_id }),
                    sticky: topic.sticky ?? false,
                    created_at: topic.created_at,
                    updated_at: topic.updated_at,
                    ...(topic.replied_at != null && { replied_at: topic.replied_at })
                }));

                if (topics.length > 0) {
                    await nango.batchSave(topics, 'ForumTopic');
                }

                nextTopicPage++;
                await nango.saveCheckpoint({ forum_id: forum.id, topic_page: nextTopicPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ForumTopic');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
