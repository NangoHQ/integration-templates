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
                "Project name applied to every heartbeat, overriding each heartbeat's own project. With cleanup, any project newly created by the heartbeats is deleted, whichever name it has."
            ),
        pollIntervalSeconds: z.number().optional().describe('Seconds to wait between confirmation polls. Defaults to 3.'),
        maxPollAttempts: z.number().optional().describe('Maximum confirmation poll attempts before giving up. Defaults to 10.')
    })
    .describe('Heartbeats to log, plus optional polling and cleanup controls.');

const HeartbeatResultSchema = z.object({
    id: z.string().optional().describe('Provider id of the created heartbeat; absent when the provider did not create it.'),
    entity: z.string().describe('Entity the heartbeat logged time against.'),
    time: z.number().describe('UNIX epoch timestamp of the heartbeat.'),
    date: z.string().describe('Local date (YYYY-MM-DD) the heartbeat was polled under.'),
    status_code: z.number().describe('Per-heartbeat HTTP status code from the bulk create response. Example: 201 when created.'),
    created: z.boolean().describe('Whether the provider created this heartbeat.'),
    skip: z.string().optional().describe('Reason the provider skipped this heartbeat, if any. Example: a duplicate heartbeat.'),
    error: z.string().optional().describe('Provider error explaining why this heartbeat was not created, if any.'),
    confirmed: z
        .boolean()
        .describe('Whether the heartbeat became visible in the heartbeats list before the poll window elapsed; always false when not created.'),
    attempts_taken: z.number().describe('Poll attempt at which the heartbeat was confirmed, or the total attempts made when it was never confirmed.')
});

const ProjectCleanupSchema = z.object({
    name: z.string().describe('Project name that did not exist before the heartbeats were created.'),
    project_id: z.string().optional().describe('Id of the newly created project, when it was found.'),
    deleted: z.boolean().describe('Whether the newly created project was found and deleted.'),
    removal_confirmed: z
        .boolean()
        .describe('Whether the deleted project was confirmed absent afterwards; false when it was not found, since it may still appear later.')
});

const CleanupResultSchema = z.object({
    heartbeats_deleted: z.array(z.string()).describe('Ids of the heartbeats that were deleted.'),
    heartbeats_removal_confirmed: z.boolean().describe('Whether the deleted heartbeats were confirmed absent on a follow-up poll.'),
    projects: z
        .array(ProjectCleanupSchema)
        .describe('One entry per project name used by the created heartbeats that did not exist beforehand; empty when every project already existed.')
});

const OutputSchema = z
    .object({
        results: z.array(HeartbeatResultSchema).describe('Per-heartbeat creation and confirmation results, in input order.'),
        all_confirmed: z.boolean().describe('Whether every submitted heartbeat was created and confirmed visible.'),
        attempts_taken: z.number().describe('Total number of confirmation poll attempts performed.'),
        cleanup: CleanupResultSchema.optional().describe('Cleanup outcome; present only when cleanup was requested.')
    })
    .describe('Confirmation results for each created heartbeat, with optional cleanup outcome.');

const BulkCreateEntrySchema = z.object({
    data: z
        .object({
            id: z.string()
        })
        .nullable()
        .optional(),
    skip: z.string().nullable().optional(),
    error: z.string().nullable().optional(),
    // Rejected heartbeats report per-field validation errors, e.g. {"type": ["Not a valid choice."]}.
    errors: z.record(z.string(), z.array(z.string())).nullable().optional()
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
    data: z.array(ProjectSchema),
    next_page: z.number().nullable().optional()
});

const CurrentUserSchema = z.object({
    data: z.object({
        timezone: z.string().nullable().optional()
    })
});

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the current user, heartbeats, and projects; creates heartbeats; and with cleanup permanently deletes the created heartbeats and any project they created.
 * @pitfalls: Newly created heartbeats may take many seconds to become visible, so confirmation can time out; a heartbeat the provider skips or rejects (e.g. a time outside the accepted range, or a duplicate) is reported per item with created=false rather than failing the call; cleanup permanently deletes the created heartbeats, and WakaTime creates a project record asynchronously (observed ~1 minute later), so a project not found within the poll window is reported with deleted=false and may need removing later with delete-project.
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

        // Looks up projects by exact name. Each name is searched with `q` and every page is followed, so an existing
        // project on a later page is never mistaken for one the heartbeats created (which cleanup would delete).
        const listProjectsNamed = async (names: string[]): Promise<z.infer<typeof ProjectSchema>[]> => {
            const matches: z.infer<typeof ProjectSchema>[] = [];
            for (const name of names) {
                let page: number | undefined;
                do {
                    // https://wakatime.com/developers#projects
                    const response = await nango.get({
                        endpoint: '/api/v1/users/current/projects',
                        params: { q: name, ...(page !== undefined && { page }), ...pollParam() },
                        retries: 3
                    });
                    const parsed = ProjectsResponseSchema.parse(response.data);
                    matches.push(...parsed.data.filter((project) => project.name === name));
                    page = parsed.next_page != null && parsed.next_page > (page ?? 1) ? parsed.next_page : undefined;
                } while (page !== undefined);
            }
            return matches;
        };

        const heartbeatsToSend = input.heartbeats.map((heartbeat) =>
            input.projectName !== undefined ? { ...heartbeat, project: input.projectName } : heartbeat
        );

        // Snapshot every project name in the batch so cleanup can tell newly created projects apart from existing ones.
        const projectNames = Array.from(new Set(heartbeatsToSend.flatMap((heartbeat) => (heartbeat.project !== undefined ? [heartbeat.project] : []))));
        let existingProjectNames = new Set<string>();
        if (input.cleanup === true && projectNames.length > 0) {
            const beforeProjects = await listProjectsNamed(projectNames);
            existingProjectNames = new Set(beforeProjects.map((project) => project.name));
        }

        // Step 1: create the heartbeats.
        // https://wakatime.com/developers#heartbeats
        const createResponse = await nango.post({
            endpoint: '/api/v1/users/current/heartbeats.bulk',
            data: heartbeatsToSend,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0 // Non-idempotent create: a retry after a lost response would duplicate heartbeats.
        });
        const bulkCreate = BulkCreateResponseSchema.parse(createResponse.data);

        if (bulkCreate.responses.length !== heartbeatsToSend.length) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: `Expected ${heartbeatsToSend.length} heartbeat responses but received ${bulkCreate.responses.length}.`
            });
        }

        // A per-item failure must not abort the action: other heartbeats in the batch may already exist,
        // and they still need to be reported, polled, and cleaned up.
        const submitted = heartbeatsToSend.map((heartbeat, index) => {
            const [body, status] = bulkCreate.responses[index] ?? [{}, 0];
            const id = status === 201 && body.data?.id != null ? body.data.id : undefined;
            const fieldErrors =
                body.errors != null
                    ? Object.entries(body.errors)
                          .map(([field, messages]) => `${field}: ${messages.join(' ')}`)
                          .join('; ')
                    : undefined;
            const error = body.error ?? fieldErrors;
            return {
                ...(id !== undefined && { id }),
                entity: heartbeat.entity,
                time: heartbeat.time,
                project: heartbeat.project,
                date: localDate(heartbeat.time),
                status_code: status,
                ...(body.skip != null && { skip: body.skip }),
                ...(id === undefined && body.skip == null && { error: error ?? 'No heartbeat id returned.' })
            };
        });
        const created = submitted.flatMap((item) => (item.id !== undefined ? [{ ...item, id: item.id }] : []));

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

        const results = submitted.map((item) => {
            const confirmed = item.id !== undefined && confirmedAt.has(item.id);
            return {
                ...(item.id !== undefined && { id: item.id }),
                entity: item.entity,
                time: item.time,
                date: item.date,
                status_code: item.status_code,
                created: item.id !== undefined,
                ...(item.skip !== undefined && { skip: item.skip }),
                ...(item.error !== undefined && { error: item.error }),
                confirmed,
                attempts_taken: confirmed && item.id !== undefined ? (confirmedAt.get(item.id) ?? attempts) : attempts
            };
        });

        const output: z.infer<typeof OutputSchema> = {
            results,
            all_confirmed: results.every((result) => result.confirmed),
            attempts_taken: attempts
        };

        // Step 3: optional cleanup of the created heartbeats and any project they created.
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

            const removalMaxAttempts = Math.min(maxPollAttempts, 3);
            let removalConfirmed = idsByDate.size === 0;
            for (let removalAttempt = 1; !removalConfirmed && removalAttempt <= removalMaxAttempts; removalAttempt += 1) {
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
                removalConfirmed = !stillPresent;
            }

            // Only heartbeats that were actually created can have created a project.
            const newProjectNames = Array.from(
                new Set(created.flatMap((item) => (item.project !== undefined && !existingProjectNames.has(item.project) ? [item.project] : [])))
            );

            // WakaTime materializes projects asynchronously, so retry discovery before concluding none was created.
            const foundProjects = new Map<string, z.infer<typeof ProjectSchema>>();
            for (let discoveryAttempt = 1; foundProjects.size < newProjectNames.length && discoveryAttempt <= removalMaxAttempts; discoveryAttempt += 1) {
                if (discoveryAttempt > 1 && pollIntervalMs > 0) {
                    await sleep(pollIntervalMs);
                }
                const projects = await listProjectsNamed(newProjectNames.filter((name) => !foundProjects.has(name)));
                for (const project of projects) {
                    foundProjects.set(project.name, project);
                }
            }

            for (const project of foundProjects.values()) {
                // Undocumented endpoint; verified live: deleting a project removes the materialized record.
                // https://wakatime.com/developers#projects
                await nango.delete({
                    endpoint: `/api/v1/users/current/projects/${encodeURIComponent(project.id)}`,
                    // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                    retries: 0 // Destructive delete; do not risk a repeated mutation.
                });
            }

            const remainingProjectIds =
                foundProjects.size > 0 ? new Set((await listProjectsNamed(Array.from(foundProjects.keys()))).map((project) => project.id)) : new Set<string>();

            output.cleanup = {
                heartbeats_deleted: deletedIds,
                heartbeats_removal_confirmed: removalConfirmed,
                projects: newProjectNames.map((name) => {
                    const project = foundProjects.get(name);
                    return project !== undefined
                        ? { name, project_id: project.id, deleted: true, removal_confirmed: !remainingProjectIds.has(project.id) }
                        : { name, deleted: false, removal_confirmed: false };
                })
            };
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
