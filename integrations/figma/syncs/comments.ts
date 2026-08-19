import { createSync } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    handle: z.string(),
    img_url: z.string()
});

const ReactionSchema = z.object({
    user: UserSchema,
    emoji: z.string(),
    created_at: z.string()
});

const ClientMetaSchema = z
    .object({
        node_id: z.string().optional(),
        node_offset: z
            .object({
                x: z.number(),
                y: z.number()
            })
            .optional(),
        stable_path: z.string().nullable().optional()
    })
    .passthrough();

const ProviderCommentSchema = z.object({
    id: z.string(),
    file_key: z.string(),
    parent_id: z.string().optional(),
    user: UserSchema,
    created_at: z.string(),
    resolved_at: z.string().nullable().optional(),
    message: z.string(),
    order_id: z.string().nullable().optional(),
    reactions: z.array(ReactionSchema),
    client_meta: ClientMetaSchema.optional()
});

const GetCommentsResponseSchema = z.object({
    comments: z.array(ProviderCommentSchema)
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string()
});

const GetTeamProjectsResponseSchema = z.object({
    name: z.string(),
    projects: z.array(ProjectSchema)
});

const FileSchema = z.object({
    key: z.string(),
    name: z.string(),
    thumbnail_url: z.string().optional(),
    last_modified: z.string().optional()
});

const GetProjectFilesResponseSchema = z.object({
    name: z.string(),
    files: z.array(FileSchema)
});

const CommentSchema = z.object({
    id: z.string(),
    file_key: z.string(),
    parent_id: z.string().optional(),
    user_id: z.string(),
    user_handle: z.string().optional(),
    user_img_url: z.string().optional(),
    created_at: z.string(),
    resolved_at: z.string().optional(),
    message: z.string(),
    order_id: z.string().optional(),
    node_id: z.string().optional(),
    node_offset_x: z.number().optional(),
    node_offset_y: z.number().optional(),
    reactions: z.array(z.object({}).passthrough()).optional()
});

const MetadataSchema = z.object({
    team_id: z.string()
});

const CheckpointSchema = z.object({
    project_index: z.number().int().min(0),
    file_index: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync comments from Figma',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Comment: CommentSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/comments'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();

        if (!metadata?.team_id) {
            throw new Error('team_id is required in metadata');
        }
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : { project_index: 0, file_index: 0 };

        // Blocker: Figma Comments API does not support modified_since, updated_after,
        // cursors, or pagination parameters. We must perform a full refresh.
        await nango.trackDeletesStart('Comment');

        // https://www.figma.com/developers/api#get-team-projects-endpoint
        const projectsResponse = await nango.get({
            endpoint: `/v1/teams/${encodeURIComponent(metadata.team_id)}/projects`,
            retries: 3
        });

        const projectsData = GetTeamProjectsResponseSchema.parse(projectsResponse.data);

        const startProjectIndex = Math.min(checkpoint.project_index, projectsData.projects.length);

        for (let projectIndex = startProjectIndex; projectIndex < projectsData.projects.length; projectIndex++) {
            const project = projectsData.projects[projectIndex];
            if (!project) {
                continue;
            }

            // https://www.figma.com/developers/api#get-project-files-endpoint
            const filesResponse = await nango.get({
                endpoint: `/v1/projects/${encodeURIComponent(project.id)}/files`,
                retries: 3
            });

            const filesData = GetProjectFilesResponseSchema.parse(filesResponse.data);

            const startFileIndex = projectIndex === startProjectIndex ? Math.min(checkpoint.file_index, filesData.files.length) : 0;

            for (let fileIndex = startFileIndex; fileIndex < filesData.files.length; fileIndex++) {
                const file = filesData.files[fileIndex];
                if (!file) {
                    continue;
                }

                // https://www.figma.com/developers/api#get-comments-endpoint
                const commentsResponse = await nango.get({
                    endpoint: `/v1/files/${encodeURIComponent(file.key)}/comments`,
                    retries: 3
                });

                const commentsData = GetCommentsResponseSchema.parse(commentsResponse.data);

                const comments: z.infer<typeof CommentSchema>[] = [];

                for (const comment of commentsData.comments) {
                    const normalized: z.infer<typeof CommentSchema> = {
                        id: comment.id,
                        file_key: comment.file_key,
                        ...(comment.parent_id && comment.parent_id !== '' && { parent_id: comment.parent_id }),
                        user_id: comment.user.id,
                        user_handle: comment.user.handle,
                        user_img_url: comment.user.img_url,
                        created_at: comment.created_at,
                        ...(comment.resolved_at != null && { resolved_at: comment.resolved_at }),
                        message: comment.message,
                        ...(comment.order_id != null && { order_id: comment.order_id }),
                        ...(comment.client_meta?.node_id && { node_id: comment.client_meta.node_id }),
                        ...(comment.client_meta?.node_offset?.x != null && {
                            node_offset_x: comment.client_meta.node_offset.x
                        }),
                        ...(comment.client_meta?.node_offset?.y != null && {
                            node_offset_y: comment.client_meta.node_offset.y
                        }),
                        reactions: comment.reactions
                    };
                    comments.push(normalized);
                }

                if (comments.length > 0) {
                    await nango.batchSave(comments, 'Comment');
                }

                // Persist forward progress even when a valid page is empty.
                if (fileIndex + 1 < filesData.files.length) {
                    await nango.saveCheckpoint({
                        project_index: projectIndex,
                        file_index: fileIndex + 1
                    });
                } else {
                    await nango.saveCheckpoint({
                        project_index: projectIndex + 1,
                        file_index: 0
                    });
                }
            }

            // Persist progress when a project has no files so we do not restart it.
            if (filesData.files.length === 0) {
                await nango.saveCheckpoint({
                    project_index: projectIndex + 1,
                    file_index: 0
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Comment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
