import { z } from 'zod';
import { createAction } from 'nango';

const ChangeTypeEnum = z.enum([
    'none',
    'add',
    'edit',
    'encoding',
    'rename',
    'delete',
    'undelete',
    'branch',
    'merge',
    'lock',
    'rollback',
    'sourceRename',
    'targetRename',
    'property',
    'all'
]);

const ItemContentTypeEnum = z.enum(['rawText', 'base64Encoded']);

const InputSchema = z.object({
    project: z.string().describe('Project ID or project name. Example: "nangoapi"'),
    repositoryId: z.string().describe('The name or ID of the repository. Example: "8ee9091d-0f54-4633-9bb2-b5ac74855a46"'),
    branch: z.string().describe('Branch name to push to. Example: "master" or "refs/heads/master"'),
    oldObjectId: z
        .string()
        .describe('The current object ID (SHA) of the branch tip. Use "0000000000000000000000000000000000000000" for an initial push to a new branch.'),
    commits: z.array(
        z.object({
            comment: z.string().describe('Commit message.'),
            changes: z.array(
                z
                    .object({
                        changeType: ChangeTypeEnum,
                        path: z.string().describe('File path. Example: "/readme.md"'),
                        newContent: z
                            .object({
                                content: z.string(),
                                contentType: ItemContentTypeEnum
                            })
                            .optional()
                            .describe('Required for add, edit, and encoding operations.'),
                        sourceServerItem: z.string().optional().describe('Required for rename, sourceRename, and targetRename operations. Example: "/old-name.md"')
                    })
                    .superRefine((change, ctx) => {
                        if (['add', 'edit', 'encoding'].includes(change.changeType) && change.newContent === undefined) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: `newContent is required for changeType '${change.changeType}'`,
                                path: ['newContent']
                            });
                        }
                        if (['rename', 'sourceRename', 'targetRename'].includes(change.changeType) && change.sourceServerItem === undefined) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: `sourceServerItem is required for changeType '${change.changeType}'`,
                                path: ['sourceServerItem']
                            });
                        }
                    })
            )
        })
    )
});

const OutputSchema = z.object({
    pushId: z.number(),
    date: z.string().optional(),
    url: z.string().optional(),
    commits: z.array(
        z.object({
            commitId: z.string(),
            comment: z.string().optional(),
            treeId: z.string().optional(),
            authorName: z.string().optional(),
            authorEmail: z.string().optional(),
            authorDate: z.string().optional(),
            url: z.string().optional()
        })
    ),
    refUpdates: z.array(
        z.object({
            name: z.string(),
            oldObjectId: z.string().optional(),
            newObjectId: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'Push one or more file changes to a Git repository branch.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/push-commits',
        group: 'Git'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.code_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const refName = input.branch.startsWith('refs/') ? input.branch : `refs/heads/${input.branch}`;

        const response = await nango.post({
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pushes/create?view=azure-devops-rest-7.2
            endpoint: `/${encodeURIComponent(input.project)}/_apis/git/repositories/${encodeURIComponent(input.repositoryId)}/pushes`,
            params: {
                'api-version': '7.2-preview.3'
            },
            data: {
                refUpdates: [
                    {
                        name: refName,
                        oldObjectId: input.oldObjectId
                    }
                ],
                commits: input.commits.map((commit) => ({
                    comment: commit.comment,
                    changes: commit.changes.map((change) => ({
                        changeType: change.changeType,
                        item: {
                            path: change.path
                        },
                        ...(change.newContent !== undefined && {
                            newContent: {
                                content: change.newContent.content,
                                contentType: change.newContent.contentType
                            }
                        }),
                        ...(change.sourceServerItem !== undefined && {
                            sourceServerItem: change.sourceServerItem
                        })
                    }))
                }))
            },
            retries: 1
        });

        const push = z
            .object({
                pushId: z.number(),
                date: z.string().optional(),
                url: z.string().optional(),
                commits: z
                    .array(
                        z.object({
                            commitId: z.string(),
                            comment: z.string().optional(),
                            treeId: z.string().optional(),
                            author: z
                                .object({
                                    name: z.string().optional(),
                                    email: z.string().optional(),
                                    date: z.string().optional()
                                })
                                .optional(),
                            url: z.string().optional()
                        })
                    )
                    .optional(),
                refUpdates: z
                    .array(
                        z.object({
                            name: z.string(),
                            oldObjectId: z.string().optional(),
                            newObjectId: z.string().optional()
                        })
                    )
                    .optional()
            })
            .parse(response.data);

        return {
            pushId: push.pushId,
            date: push.date,
            url: push.url,
            commits:
                push.commits?.map((commit) => ({
                    commitId: commit.commitId,
                    comment: commit.comment,
                    treeId: commit.treeId,
                    authorName: commit.author?.name,
                    authorEmail: commit.author?.email,
                    authorDate: commit.author?.date,
                    url: commit.url
                })) ?? [],
            refUpdates:
                push.refUpdates?.map((ref) => ({
                    name: ref.name,
                    oldObjectId: ref.oldObjectId,
                    newObjectId: ref.newObjectId
                })) ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
