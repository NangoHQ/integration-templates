import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderDockItemSchema = z.object({
    id: z.number(),
    title: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    position: z.number().nullable(),
    url: z.string(),
    app_url: z.string()
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    status: z.string(),
    dock: z.array(ProviderDockItemSchema)
});

const ProviderParticipantSchema = z.object({
    id: z.number(),
    name: z.string(),
    email_address: z.string().optional(),
    personable_type: z.string().optional(),
    title: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional()
});

const ProviderCreatorSchema = z.object({
    id: z.number(),
    name: z.string(),
    email_address: z.string(),
    avatar_url: z.string().nullable().optional()
});

const ProviderBucketSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string()
});

const ProviderParentSchema = z.object({
    id: z.number(),
    title: z.string(),
    type: z.string()
});

const ProviderScheduleEntrySchema = z.object({
    id: z.number(),
    status: z.string(),
    visible_to_clients: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string().nullable().optional(),
    inherits_status: z.boolean().optional(),
    type: z.string(),
    url: z.string(),
    app_url: z.string(),
    comments_count: z.number(),
    comments_url: z.string(),
    description: z.string().nullable().optional(),
    description_attachments: z.array(z.unknown()).optional(),
    summary: z.string().nullable().optional(),
    all_day: z.boolean(),
    highlighted: z.boolean(),
    starts_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
    join_url: z.string().nullable().optional(),
    parent: ProviderParentSchema,
    bucket: ProviderBucketSchema,
    creator: ProviderCreatorSchema,
    participants: z.array(ProviderParticipantSchema).optional()
});

const ParticipantSchema = z
    .object({
        id: z.string().describe('The unique identifier for the participant'),
        name: z.string().describe('The name of the participant'),
        email_address: z.string().optional().describe('The email address of the participant'),
        personable_type: z.string().optional().describe('The type of person, such as User'),
        title: z.string().optional().describe('The job title of the participant'),
        avatar_url: z.string().optional().describe('The avatar URL for the participant')
    })
    .describe('A person participating in the schedule entry');

const ScheduleEntrySchema = z
    .object({
        id: z.string().describe('The unique identifier for the schedule entry'),
        status: z.string().describe('The status of the entry, such as active, archived, or trashed'),
        visible_to_clients: z.boolean().describe('Whether this entry is visible to client users'),
        created_at: z.string().describe('ISO 8601 timestamp when the entry was created'),
        updated_at: z.string().describe('ISO 8601 timestamp when the entry was last updated'),
        title: z.string().optional().describe('The title of the schedule entry'),
        type: z.string().describe('The Basecamp resource type, typically Schedule::Entry'),
        url: z.string().describe('The API URL for this schedule entry'),
        app_url: z.string().describe('The Basecamp web app URL for this schedule entry'),
        comments_count: z.number().describe('The number of comments on this entry'),
        comments_url: z.string().describe('The API URL for the comments on this entry'),
        description: z.string().optional().describe('The HTML description of the schedule entry'),
        summary: z.string().optional().describe('A short summary of the schedule entry'),
        all_day: z.boolean().describe('Whether this is an all-day event'),
        highlighted: z.boolean().describe('Whether this entry is highlighted on the schedule'),
        starts_at: z.string().optional().describe('ISO 8601 start time for the event'),
        ends_at: z.string().optional().describe('ISO 8601 end time for the event'),
        join_url: z.string().optional().describe('A join URL for the event, such as a video call link'),
        project_id: z.string().describe('The ID of the project this entry belongs to'),
        project_name: z.string().describe('The name of the project this entry belongs to'),
        schedule_id: z.string().describe('The ID of the parent schedule'),
        schedule_title: z.string().describe('The title of the parent schedule'),
        creator_id: z.string().describe('The ID of the person who created this entry'),
        creator_name: z.string().describe('The name of the person who created this entry'),
        participants: z.array(ParticipantSchema).describe('The people participating in this schedule entry')
    })
    .describe('A calendar event from a Basecamp project schedule');

const CheckpointSchema = z.object({
    projectScheduleIndex: z.number().int().nonnegative(),
    entryStatusIndex: z
        .number()
        .int()
        .min(0)
        .max(2)
        .describe('Index into the entry status array (0=active, 1=archived, 2=trashed) to resume the current project-schedule from.')
});

const sync = createSync({
    description: 'Sync schedule entries (calendar events) across all known projects',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ScheduleEntry: ScheduleEntrySchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint !== undefined ? CheckpointSchema.safeParse(rawCheckpoint) : undefined;
        const projectScheduleIndex = checkpoint?.success ? (checkpoint.data.projectScheduleIndex ?? 0) : 0;
        const startEntryStatusIndex = checkpoint?.success ? checkpoint.data.entryStatusIndex : 0;

        const projectProxyConfig: ProxyConfiguration = {
            // https://github.com/basecamp/bc3-api/blob/master/sections/projects.md
            endpoint: '/projects.json',
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        const projects: Array<{
            id: number;
            name: string;
            status: string;
            dock: Array<{ id: number; name: string; title: string; enabled: boolean; url: string; app_url: string; position: number | null }>;
        }> = [];
        for await (const projectPage of nango.paginate(projectProxyConfig)) {
            for (const project of projectPage) {
                const parsed = ProviderProjectSchema.safeParse(project);
                if (!parsed.success) {
                    throw new Error(`Failed to parse project: ${parsed.error.message}`);
                }
                projects.push(parsed.data);
            }
        }

        const projectSchedules: Array<{ projectId: number; projectName: string; scheduleId: number; scheduleTitle: string }> = [];
        for (const project of projects) {
            const scheduleDock = project.dock.find((item) => item.name === 'schedule');
            if (!scheduleDock) {
                continue;
            }
            projectSchedules.push({
                projectId: project.id,
                projectName: project.name,
                scheduleId: scheduleDock.id,
                scheduleTitle: scheduleDock.title
            });
        }

        // If there is nothing to crawl (no projects with an enabled schedule) or the checkpoint
        // points past the end of the freshly discovered schedules (e.g. a corrupted checkpoint,
        // or one saved right at the completion boundary by a prior execution that then crashed
        // before trackDeletesEnd ran), skip delete tracking entirely instead of opening and
        // immediately closing an empty window, which would delete every stored ScheduleEntry.
        if (projectScheduleIndex >= projectSchedules.length) {
            await nango.clearCheckpoint();
            return;
        }

        await nango.trackDeletesStart('ScheduleEntry');

        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/schedule_entries.md
        // GET /schedules/:id/entries.json only returns active entries by default; archived and
        // trashed entries must be requested explicitly via the status param, or they would be
        // silently omitted from every crawl and then removed by trackDeletesEnd.
        const entryStatuses = ['active', 'archived', 'trashed'];

        for (let i = projectScheduleIndex; i < projectSchedules.length; i++) {
            const ps = projectSchedules[i];
            if (!ps) {
                continue;
            }

            // Resume the status loop for the checkpointed project-schedule at the status it was
            // interrupted on instead of always restarting from 'active': the checkpoint only
            // persists projectScheduleIndex until the whole status loop for a project-schedule
            // completes, so without entryStatusIndex a resume would redundantly re-fetch and
            // re-save already-processed statuses for that project-schedule.
            const startStatusIndex = i === projectScheduleIndex ? startEntryStatusIndex : 0;

            for (let statusIdx = startStatusIndex; statusIdx < entryStatuses.length; statusIdx++) {
                const entryStatus = entryStatuses[statusIdx];
                if (!entryStatus) {
                    continue;
                }

                const entryProxyConfig: ProxyConfiguration = {
                    // https://github.com/basecamp/bc3-api/blob/master/sections/schedule_entries.md
                    endpoint: `/buckets/${encodeURIComponent(ps.projectId)}/schedules/${encodeURIComponent(ps.scheduleId)}/entries.json`,
                    ...(entryStatus !== 'active' && { params: { status: entryStatus } }),
                    paginate: {
                        type: 'link',
                        link_rel_in_response_header: 'next',
                        limit_name_in_request: 'limit',
                        limit: 100
                    },
                    retries: 3
                };

                for await (const entryPageResults of nango.paginate(entryProxyConfig)) {
                    const entries = [];
                    for (const entry of entryPageResults) {
                        const parsed = ProviderScheduleEntrySchema.safeParse(entry);
                        if (!parsed.success) {
                            throw new Error(`Failed to parse schedule entry: ${parsed.error.message}`);
                        }
                        const data = parsed.data;

                        entries.push({
                            id: String(data.id),
                            status: data.status,
                            visible_to_clients: data.visible_to_clients,
                            created_at: data.created_at,
                            updated_at: data.updated_at,
                            type: data.type,
                            url: data.url,
                            app_url: data.app_url,
                            comments_count: data.comments_count,
                            comments_url: data.comments_url,
                            all_day: data.all_day,
                            highlighted: data.highlighted,
                            project_id: String(data.bucket.id),
                            project_name: data.bucket.name,
                            schedule_id: String(data.parent.id),
                            schedule_title: data.parent.title,
                            creator_id: String(data.creator.id),
                            creator_name: data.creator.name,
                            ...(data.title != null && { title: data.title }),
                            ...(data.description != null && { description: data.description }),
                            ...(data.summary != null && { summary: data.summary }),
                            ...(data.starts_at != null && { starts_at: data.starts_at }),
                            ...(data.ends_at != null && { ends_at: data.ends_at }),
                            ...(data.join_url != null && { join_url: data.join_url }),
                            participants: (data.participants ?? []).map((p) => ({
                                id: String(p.id),
                                name: p.name,
                                ...(p.email_address != null && { email_address: p.email_address }),
                                ...(p.personable_type != null && { personable_type: p.personable_type }),
                                ...(p.title != null && { title: p.title }),
                                ...(p.avatar_url != null && { avatar_url: p.avatar_url })
                            }))
                        });
                    }

                    if (entries.length > 0) {
                        await nango.batchSave(entries, 'ScheduleEntry');
                    }

                    await nango.saveCheckpoint({
                        projectScheduleIndex: i,
                        entryStatusIndex: statusIdx
                    });
                }
            }

            await nango.saveCheckpoint({
                projectScheduleIndex: i + 1,
                entryStatusIndex: 0
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ScheduleEntry');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
