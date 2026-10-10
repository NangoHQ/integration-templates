import { z } from 'zod';
import { createAction } from 'nango';

const HeartbeatInputSchema = z.object({
    entity: z.string().describe('Entity the heartbeat logs time against, such as an absolute file path or a domain. Example: "/home/user/project/index.ts".'),
    type: z.enum(['file', 'app', 'url', 'domain']).describe('Type of the entity.'),
    time: z.number().describe('UNIX epoch timestamp in seconds for the heartbeat.'),
    category: z
        .enum([
            'coding',
            'building',
            'indexing',
            'debugging',
            'browsing',
            'running tests',
            'writing tests',
            'manual testing',
            'writing docs',
            'communicating',
            'code reviewing',
            'notes',
            'researching',
            'learning',
            'designing',
            'ai coding'
        ])
        .optional()
        .describe('Activity category; inferred from type when omitted.'),
    project: z.string().optional().describe('Project name to associate with the heartbeat.'),
    branch: z.string().optional().describe('Branch name the heartbeat was generated on.'),
    language: z.string().optional().describe('Programming language of the entity.'),
    dependencies: z.string().optional().describe('Comma-separated list of dependencies detected from the entity file.'),
    lines: z.number().optional().describe('Total number of lines in the entity when it is a file.'),
    is_write: z.boolean().optional().describe('Whether the heartbeat was triggered by writing to a file.')
});

const InputSchema = z
    .object({
        heartbeats: z.array(HeartbeatInputSchema).min(1).max(25).describe('Heartbeats to create in a single bulk request (1 to 25).'),
        cleanup: z
            .boolean()
            .optional()
            .describe('When true, delete the created heartbeats and any project they created after confirming them, leaving the account as it was.'),
        projectName: z
            .string()
            .optional()
            .describe(
                'Project name used on the heartbeats; when set with cleanup, a project newly created with this name is also deleted. Defaults to the project of the first heartbeat.'
            ),
        pollIntervalSeconds: z.number().optional().describe('Seconds to wait between confirmation polls. Defaults to 3.'),
        maxPollAttempts: z.number().optional().describe('Maximum confirmation poll attempts before giving up. Defaults to 10.')
    })
    .describe('Heartbeats to log, plus optional polling and cleanup controls.');

const HeartbeatResultSchema = z.object({
    id: z.string().describe('Provider id of the created heartbeat.'),
    entity: z.string().describe('Entity the heartbeat logged time against.'),
    time: z.number().describe('UNIX epoch timestamp of the heartbeat.'),
    date: z.string().describe('Local date (YYYY-MM-DD) the heartbeat was polled under.'),
    confirmed: z.boolean().describe('Whether the heartbeat became visible in the heartbeats list before the poll window elapsed.'),
    attempts_taken: z.number().describe('Poll attempt at which the heartbeat was confirmed, or the total attempts made when it was never confirmed.')
});

const CleanupResultSchema = z.object({
    heartbeats_deleted: z.array(z.string()).describe('Ids of the heartbeats that were deleted.'),
    heartbeats_removal_confirmed: z.boolean().describe('Whether the deleted heartbeats were confirmed absent on a follow-up poll.'),
    project_name: z.string().optional().describe('Project name that was checked for side-effect creation.'),
    project_deleted: z.boolean().describe('Whether a newly created project record was found and deleted.'),
    project_id: z.string().optional().describe('Id of the project that was deleted.'),
    project_removal_confirmed: z.boolean().describe('Whether the deleted project was confirmed absent afterwards, or true when there was nothing to delete.')
});

const OutputSchema = z
    .object({
        results: z.array(HeartbeatResultSchema).describe('Per-heartbeat confirmation results.'),
        all_confirmed: z.boolean().describe('Whether every created heartbeat was confirmed visible.'),
        attempts_taken: z.number().describe('Total number of confirmation poll attempts performed.'),
        cleanup: CleanupResultSchema.optional().describe('Cleanup outcome; present only when cleanup was requested.')
    })
    .describe('Confirmation results for each created heartbeat, with optional cleanup outcome.');

const BulkCreateEntrySchema = z.object({
    data: z
        .object({
            id: z.string()
        })
        .optional(),
    id: z.string().optional(),
    skip: z.string().optional(),
    error: z.string().optional()
});

const BulkCreateResponseSchema = z.object({
    responses: z.array(z.tuple([BulkCreateEntrySchema, z.number()]))
});

const HeartbeatSchema = z.object({
    id: z.string(),
    entity: z.string().optional(),
    time: z.number().optional(),
    project: z.string().nullable().optional()
});

const HeartbeatsResponseSchema = z.object({
    data: z.array(HeartbeatSchema)
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProjectsResponseSchema = z.object({
    data: z.array(ProjectSchema)
});

const CurrentUserSchema = z.object({
    data: z.object({
        timezone: z.string().nullable().optional()
    })
});

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the current user, heartbeats, and projects; creates heartbeats; and with cleanup permanently deletes the created heartbeats and any project they created.
 * @pitfalls: Newly created heartbeats may take many seconds to become visible, so confirmation can time out; reposting the same entity and time within about a minute is rejected by the provider as a duplicate and fails the call; cleanup permanently deletes the heartbeats, and a project they created can outlive them and is only removed when its name is known.
 */
const action = createAction({
    description:
        'COMPOSITE: Create one or more heartbeats, poll until they are confirmed visible (or a timeout is reached), and optionally delete the heartbeats and any project they created.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_heartbeats', 'write_heartbeats'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pollIntervalMs = Math.max(0, input.pollIntervalSeconds ?? 3) * 1000;
        const maxPollAttempts = Math.max(1, Math.floor(input.maxPollAttempts ?? 10));

        // Every provider read below is repeated while polling. A unique query param keeps each
        // request distinct so recorded mocks replay deterministically; WakaTime ignores it.
        let pollToken = 0;
        const pollParam = (): Record<string, number> => {
            pollToken += 1;
            return { _nango_poll: pollToken };
        };

        const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

        // https://wakatime.com/developers#users
        const userResponse = await nango.get({
            endpoint: '/api/v1/users/current',
            retries: 3
        });
        const currentUser = CurrentUserSchema.parse(userResponse.data);
        const timeZone = currentUser.data.timezone != null && currentUser.data.timezone.length > 0 ? currentUser.data.timezone : 'UTC';

        const localDate = (epochSeconds: number): string => {
            const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(
                new Date(epochSeconds * 1000)
            );
            const value = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
            return `${value('year')}-${value('month')}-${value('day')}`;
        };

        const listHeartbeats = async (date: string): Promise<z.infer<typeof HeartbeatSchema>[]> => {
            // https://wakatime.com/developers#heartbeats
            const response = await nango.get({
                endpoint: '/api/v1/users/current/heartbeats',
                params: { date, ...pollParam() },
                retries: 3
            });
            return HeartbeatsResponseSchema.parse(response.data).data;
        };

        const listProjects = async (): Promise<z.infer<typeof ProjectSchema>[]> => {
            // https://wakatime.com/developers#projects
            const response = await nango.get({
                endpoint: '/api/v1/users/current/projects',
                params: { ...pollParam() },
                retries: 3
            });
            return ProjectsResponseSchema.parse(response.data).data;
        };

        let projectNameToCheck: string | undefined;
        if (input.cleanup === true) {
            if (input.projectName !== undefined) {
                projectNameToCheck = input.projectName;
            } else {
                projectNameToCheck = input.heartbeats.find((heartbeat) => heartbeat.project !== undefined)?.project;
            }
        }

        let existingProjectIds = new Set<string>();
        if (projectNameToCheck !== undefined) {
            const beforeProjects = await listProjects();
            existingProjectIds = new Set(beforeProjects.filter((project) => project.name === projectNameToCheck).map((project) => project.id));
        }

        // Step 1: create the heartbeats.
        // https://wakatime.com/developers#heartbeats
        const createResponse = await nango.post({
            endpoint: '/api/v1/users/current/heartbeats.bulk',
            data: input.heartbeats,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0 // Non-idempotent create: a retry after a lost response would duplicate heartbeats.
        });
        const bulkCreate = BulkCreateResponseSchema.parse(createResponse.data);

        if (bulkCreate.responses.length !== input.heartbeats.length) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: `Expected ${input.heartbeats.length} heartbeat responses but received ${bulkCreate.responses.length}.`
            });
        }

        const created = input.heartbeats.map((heartbeat, index) => {
            const entry = bulkCreate.responses[index];
            const body = entry?.[0];
            const status = entry?.[1];
            if (body?.skip !== undefined) {
                throw new nango.ActionError({
                    type: 'heartbeat_skipped',
                    message: `Heartbeat at index ${index} was skipped by the provider: ${body.skip}.`
                });
            }
            if (status !== 201 || body?.data?.id === undefined) {
                throw new nango.ActionError({
                    type: 'heartbeat_create_failed',
                    message: `Heartbeat at index ${index} was not created (status ${status ?? 'unknown'}): ${body?.error ?? 'no id returned'}.`
                });
            }
            return {
                id: body.data.id,
                entity: heartbeat.entity,
                time: heartbeat.time,
                date: localDate(heartbeat.time)
            };
        });

        // Step 2: poll until every created heartbeat is visible.
        const pending = new Map<string, string>();
        for (const item of created) {
            pending.set(item.id, item.date);
        }
        const confirmedAt = new Map<string, number>();
        let attempts = 0;
        while (attempts < maxPollAttempts && pending.size > 0) {
            attempts += 1;
            if (attempts > 1 && pollIntervalMs > 0) {
                await sleep(pollIntervalMs);
            }
            const dates = Array.from(new Set(pending.values()));
            for (const date of dates) {
                const heartbeats = await listHeartbeats(date);
                for (const heartbeat of heartbeats) {
                    if (pending.has(heartbeat.id)) {
                        confirmedAt.set(heartbeat.id, attempts);
                        pending.delete(heartbeat.id);
                    }
                }
            }
        }

        const results = created.map((item) => {
            const confirmed = confirmedAt.has(item.id);
            return {
                id: item.id,
                entity: item.entity,
                time: item.time,
                date: item.date,
                confirmed,
                attempts_taken: confirmed ? (confirmedAt.get(item.id) ?? attempts) : attempts
            };
        });

        const output: z.infer<typeof OutputSchema> = {
            results,
            all_confirmed: results.every((result) => result.confirmed),
            attempts_taken: attempts
        };

        // Step 3: optional cleanup of the heartbeats and any project they created.
        if (input.cleanup === true) {
            const idsByDate = new Map<string, string[]>();
            for (const item of created) {
                const ids = idsByDate.get(item.date) ?? [];
                ids.push(item.id);
                idsByDate.set(item.date, ids);
            }

            const deletedIds: string[] = [];
            for (const [date, ids] of idsByDate) {
                // https://wakatime.com/developers#heartbeats
                await nango.delete({
                    endpoint: '/api/v1/users/current/heartbeats.bulk',
                    data: { date, ids },
                    // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                    retries: 0 // Destructive delete of explicit ids; do not risk a repeated mutation.
                });
                deletedIds.push(...ids);
            }

            let removalConfirmed = false;
            const removalMaxAttempts = Math.min(maxPollAttempts, 3);
            for (let removalAttempt = 1; removalAttempt <= removalMaxAttempts; removalAttempt += 1) {
                if (removalAttempt > 1 && pollIntervalMs > 0) {
                    await sleep(pollIntervalMs);
                }
                let stillPresent = false;
                for (const [date, ids] of idsByDate) {
                    const heartbeats = await listHeartbeats(date);
                    if (heartbeats.some((heartbeat) => ids.includes(heartbeat.id))) {
                        stillPresent = true;
                    }
                }
                if (!stillPresent) {
                    removalConfirmed = true;
                    break;
                }
            }

            let projectName: string | undefined;
            let projectId: string | undefined;
            let projectDeleted = false;
            let projectRemovalConfirmed = true;

            if (projectNameToCheck !== undefined) {
                const afterProjects = await listProjects();
                const newProject = afterProjects.find((project) => project.name === projectNameToCheck && !existingProjectIds.has(project.id));
                if (newProject !== undefined) {
                    projectName = newProject.name;
                    projectId = newProject.id;
                    // Undocumented endpoint; verified live: deleting a project removes the materialized record.
                    // https://wakatime.com/developers#projects
                    await nango.delete({
                        endpoint: `/api/v1/users/current/projects/${encodeURIComponent(newProject.id)}`,
                        // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                        retries: 0 // Destructive delete; do not risk a repeated mutation.
                    });
                    projectDeleted = true;
                    const finalProjects = await listProjects();
                    projectRemovalConfirmed = !finalProjects.some((project) => project.id === newProject.id);
                }
            }

            output.cleanup = {
                heartbeats_deleted: deletedIds,
                heartbeats_removal_confirmed: removalConfirmed,
                project_deleted: projectDeleted,
                project_removal_confirmed: projectRemovalConfirmed,
                ...(projectName !== undefined ? { project_name: projectName } : {}),
                ...(projectId !== undefined ? { project_id: projectId } : {})
            };
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
