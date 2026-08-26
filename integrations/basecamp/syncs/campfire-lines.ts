import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CampfireLineSchema = z
    .object({
        id: z.string().describe('The unique identifier of the campfire line.'),
        status: z.string().describe('The current status of the line, e.g. active or trashed.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the line was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the line was last updated.'),
        title: z.string().describe('The title or summary of the line content.'),
        type: z.string().describe('The type of the line, e.g. Chat::Lines::Text, Chat::Lines::RichText, or Chat::Lines::Upload.'),
        content: z.string().optional().describe('The body content of the line in plain text or HTML.'),
        creator_id: z.string().describe('The unique identifier of the person who created the line.'),
        creator_name: z.string().describe('The display name of the person who created the line.'),
        creator_email: z.string().describe('The email address of the person who created the line.'),
        project_id: z.string().describe('The unique identifier of the project this line belongs to.'),
        project_name: z.string().describe('The name of the project this line belongs to.'),
        chat_id: z.string().describe('The unique identifier of the parent campfire chat.'),
        chat_title: z.string().describe('The title of the parent campfire chat.'),
        boosts_count: z.number().describe('The number of boosts (reactions) on the line.')
    })
    .describe('A single chat line posted in a Basecamp Campfire.');

const CheckpointSchema = z
    .object({
        pendingChats: z.string().describe('JSON-encoded queue of remaining { projectId, chatId } pairs to crawl.')
    })
    .describe('Checkpoint used to resume a full-refresh sync across chats.');

const ChatRefSchema = z.object({
    projectId: z.string(),
    chatId: z.string()
});

function parsePendingChats(json: string): Array<z.infer<typeof ChatRefSchema>> {
    return z.array(ChatRefSchema).parse(JSON.parse(json));
}

const ProjectListItemSchema = z.object({
    id: z.number()
});

const ProjectDetailSchema = z.object({
    id: z.number(),
    dock: z.array(
        z
            .object({
                id: z.number(),
                name: z.string()
            })
            .passthrough()
    )
});

const CampfireLineProviderSchema = z
    .object({
        id: z.number(),
        status: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        title: z.string(),
        type: z.string(),
        content: z.string().optional(),
        boosts_count: z.number(),
        parent: z
            .object({
                id: z.number(),
                title: z.string()
            })
            .passthrough(),
        bucket: z
            .object({
                id: z.number(),
                name: z.string()
            })
            .passthrough(),
        creator: z
            .object({
                id: z.number(),
                name: z.string(),
                email_address: z.string()
            })
            .passthrough()
    })
    .passthrough();

const sync = createSync({
    description: "Sync chat lines across all known projects' Campfires.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CampfireLine: CampfireLineSchema
    },

    exec: async (nango) => {
        // Blocker: No resource in the Basecamp API exposes a modified-since or updated-after filter.
        // Every list endpoint accepts only status and sort/direction parameters, never a timestamp cursor.
        // Full-refresh is required with trackDeletesStart/trackDeletesEnd.
        async function discoverChats(): Promise<Array<z.infer<typeof ChatRefSchema>>> {
            const projects: Array<{ id: number }> = [];

            const projectsConfig: ProxyConfiguration = {
                // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/projects.md
                endpoint: '/projects.json',
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'limit'
                },
                retries: 3
            };

            for await (const page of nango.paginate(projectsConfig)) {
                for (const item of page) {
                    const validated = ProjectListItemSchema.parse(item);
                    projects.push(validated);
                }
            }

            const chats: Array<z.infer<typeof ChatRefSchema>> = [];
            for (const project of projects) {
                // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/projects.md
                const projectResponse = await nango.get({
                    endpoint: `/projects/${encodeURIComponent(project.id)}.json`,
                    retries: 3
                });

                const validatedProject = ProjectDetailSchema.parse(projectResponse.data);
                const chatEntry = validatedProject.dock.find((entry) => entry.name === 'chat');
                if (chatEntry) {
                    chats.push({ projectId: String(project.id), chatId: String(chatEntry.id) });
                }
            }

            return chats;
        }

        const checkpoint = await nango.getCheckpoint();
        let queue: Array<z.infer<typeof ChatRefSchema>>;

        if (checkpoint != null && typeof checkpoint['pendingChats'] === 'string') {
            queue = parsePendingChats(checkpoint['pendingChats']);
            // A checkpoint restored with an empty queue is indistinguishable from a prior
            // execution that crashed right after persisting its final (empty) checkpoint but
            // before trackDeletesEnd ran. Treat it as untrustworthy and rediscover from scratch
            // rather than let an empty queue silently close out delete tracking below.
            if (queue.length === 0) {
                queue = await discoverChats();
            }
        } else {
            queue = await discoverChats();
        }

        // If there is still nothing to crawl (no projects with an enabled Chat), skip delete
        // tracking entirely instead of opening and immediately closing an empty window, which
        // would delete every previously synced CampfireLine.
        if (queue.length === 0) {
            await nango.clearCheckpoint();
            return;
        }

        await nango.trackDeletesStart('CampfireLine');

        while (queue.length > 0) {
            const pair = queue.shift();
            if (!pair) {
                continue;
            }

            const linesConfig: ProxyConfiguration = {
                // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/campfires.md
                endpoint: `/buckets/${encodeURIComponent(pair.projectId)}/chats/${encodeURIComponent(pair.chatId)}/lines.json`,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'limit'
                },
                retries: 3
            };

            for await (const page of nango.paginate(linesConfig)) {
                const lines: Array<{
                    id: string;
                    status: string;
                    created_at: string;
                    updated_at: string;
                    title: string;
                    type: string;
                    content: string | undefined;
                    creator_id: string;
                    creator_name: string;
                    creator_email: string;
                    project_id: string;
                    project_name: string;
                    chat_id: string;
                    chat_title: string;
                    boosts_count: number;
                }> = [];
                for (const item of page) {
                    const validatedLine = CampfireLineProviderSchema.parse(item);
                    lines.push({
                        id: String(validatedLine.id),
                        status: validatedLine.status,
                        created_at: validatedLine.created_at,
                        updated_at: validatedLine.updated_at,
                        title: validatedLine.title,
                        type: validatedLine.type,
                        content: validatedLine.content,
                        creator_id: String(validatedLine.creator.id),
                        creator_name: validatedLine.creator.name,
                        creator_email: validatedLine.creator.email_address,
                        project_id: String(validatedLine.bucket.id),
                        project_name: validatedLine.bucket.name,
                        chat_id: String(validatedLine.parent.id),
                        chat_title: validatedLine.parent.title,
                        boosts_count: validatedLine.boosts_count
                    });
                }

                if (lines.length > 0) {
                    await nango.batchSave(lines, 'CampfireLine');
                }
            }

            if (queue.length > 0) {
                await nango.saveCheckpoint({ pendingChats: JSON.stringify(queue) });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CampfireLine');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
