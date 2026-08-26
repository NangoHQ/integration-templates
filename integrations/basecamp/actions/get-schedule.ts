import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('The project ID (bucket ID). Example: "48644099"'),
        scheduleId: z.string().describe('The schedule ID from the project\'s dock entry where name == "schedule". Example: "10239340941"')
    })
    .describe('Input parameters for retrieving a project schedule');

const ProviderScheduleSchema = z.object({
    id: z.number(),
    status: z.string().optional(),
    visible_to_clients: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    title: z.string().optional(),
    inherits_status: z.boolean().optional(),
    type: z.string().optional(),
    url: z.string().optional(),
    app_url: z.string().optional(),
    bookmark_url: z.string().optional(),
    subscription_url: z.string().optional(),
    comments_count: z.number().optional(),
    comments_url: z.string().optional(),
    parent: z
        .object({
            id: z.number(),
            title: z.string().optional(),
            type: z.string().optional(),
            url: z.string().optional(),
            app_url: z.string().optional()
        })
        .optional(),
    bucket: z
        .object({
            id: z.number(),
            name: z.string().optional(),
            type: z.string().optional()
        })
        .optional(),
    creator: z
        .object({
            id: z.number(),
            attachable_sgid: z.string().nullable().optional(),
            name: z.string().nullable().optional(),
            email_address: z.string().nullable().optional(),
            personable_type: z.string().nullable().optional(),
            title: z.string().nullable().optional(),
            bio: z.string().nullable().optional(),
            location: z.string().nullable().optional(),
            created_at: z.string().nullable().optional(),
            updated_at: z.string().nullable().optional(),
            admin: z.boolean().nullable().optional(),
            owner: z.boolean().nullable().optional(),
            client: z.boolean().nullable().optional(),
            employee: z.boolean().nullable().optional(),
            time_zone: z.string().nullable().optional(),
            avatar_url: z.string().nullable().optional(),
            company: z
                .object({
                    id: z.number(),
                    name: z.string().nullable().optional()
                })
                .nullable()
                .optional(),
            can_manage_projects: z.boolean().nullable().optional(),
            can_manage_people: z.boolean().nullable().optional()
        })
        .nullable()
        .optional(),
    include_due_assignments: z.boolean().optional(),
    entries_count: z.number().optional(),
    entries_url: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The schedule ID'),
        status: z.string().optional().describe('The schedule status (e.g., active, trashed, archived)'),
        visible_to_clients: z.boolean().optional().describe('Whether the schedule is visible to clients'),
        created_at: z.string().optional().describe('ISO 8601 timestamp of when the schedule was created'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp of when the schedule was last updated'),
        title: z.string().optional().describe('The schedule title'),
        inherits_status: z.boolean().optional().describe('Whether the schedule inherits status from its parent'),
        type: z.string().optional().describe('The record type (e.g., "Schedule")'),
        url: z.string().optional().describe('API URL for the schedule'),
        app_url: z.string().optional().describe('Basecamp web app URL for the schedule'),
        bookmark_url: z.string().optional().describe('URL to bookmark the schedule'),
        subscription_url: z.string().optional().describe('URL for the schedule subscription'),
        comments_count: z.number().optional().describe('Number of comments on the schedule'),
        comments_url: z.string().optional().describe('API URL for the schedule comments'),
        parent: z
            .object({
                id: z.number().describe('The parent resource ID'),
                title: z.string().optional().describe('The parent resource title'),
                type: z.string().optional().describe('The parent resource type'),
                url: z.string().optional().describe('API URL for the parent resource'),
                app_url: z.string().optional().describe('Basecamp web app URL for the parent resource')
            })
            .optional()
            .describe('The parent resource of the schedule'),
        bucket: z
            .object({
                id: z.number().describe('The project (bucket) ID'),
                name: z.string().optional().describe('The project name'),
                type: z.string().optional().describe('The bucket type')
            })
            .optional()
            .describe('The project (bucket) containing the schedule'),
        creator: z
            .object({
                id: z.number().describe('The creator person ID'),
                attachable_sgid: z.string().optional().describe('Attachable SGID for the creator'),
                name: z.string().optional().describe('The creator name'),
                email_address: z.string().optional().describe('The creator email address'),
                personable_type: z.string().optional().describe('The creator personable type'),
                title: z.string().optional().describe('The creator job title'),
                bio: z.string().optional().describe('The creator bio'),
                location: z.string().optional().describe('The creator location'),
                created_at: z.string().optional().describe('ISO 8601 timestamp of when the creator account was created'),
                updated_at: z.string().optional().describe('ISO 8601 timestamp of when the creator account was last updated'),
                admin: z.boolean().optional().describe('Whether the creator is an admin'),
                owner: z.boolean().optional().describe('Whether the creator is the account owner'),
                client: z.boolean().optional().describe('Whether the creator is a client'),
                employee: z.boolean().optional().describe('Whether the creator is an employee'),
                time_zone: z.string().optional().describe('The creator time zone'),
                avatar_url: z.string().optional().describe('URL for the creator avatar image'),
                company: z
                    .object({
                        id: z.number().describe('The company ID'),
                        name: z.string().optional().describe('The company name')
                    })
                    .optional()
                    .describe('The creator company'),
                can_manage_projects: z.boolean().optional().describe('Whether the creator can manage projects'),
                can_manage_people: z.boolean().optional().describe('Whether the creator can manage people')
            })
            .optional()
            .describe('The person who created the schedule'),
        include_due_assignments: z.boolean().optional().describe('Whether due assignments are included in the schedule'),
        entries_count: z.number().optional().describe('Number of entries in the schedule'),
        entries_url: z.string().optional().describe('API URL for the schedule entries')
    })
    .describe('A project schedule (calendar) from Basecamp');

/**
 * @tags: [read]
 * @tagReason: This action performs a single GET request to retrieve a schedule from the Basecamp API.
 * @pitfalls: A 404 response can indicate a missing schedule, insufficient permission, or an inactive account; do not assume every 'not found' error means the schedule was deleted.
 */
const action = createAction({
    description: "Get a project's schedule (calendar).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/schedules.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/schedules/${encodeURIComponent(input.scheduleId)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Schedule not found',
                projectId: input.projectId,
                scheduleId: input.scheduleId
            });
        }

        const schedule = ProviderScheduleSchema.parse(response.data);

        return {
            id: schedule.id,
            ...(schedule.status !== undefined && { status: schedule.status }),
            ...(schedule.visible_to_clients !== undefined && { visible_to_clients: schedule.visible_to_clients }),
            ...(schedule.created_at !== undefined && { created_at: schedule.created_at }),
            ...(schedule.updated_at !== undefined && { updated_at: schedule.updated_at }),
            ...(schedule.title !== undefined && { title: schedule.title }),
            ...(schedule.inherits_status !== undefined && { inherits_status: schedule.inherits_status }),
            ...(schedule.type !== undefined && { type: schedule.type }),
            ...(schedule.url !== undefined && { url: schedule.url }),
            ...(schedule.app_url !== undefined && { app_url: schedule.app_url }),
            ...(schedule.bookmark_url !== undefined && { bookmark_url: schedule.bookmark_url }),
            ...(schedule.subscription_url !== undefined && { subscription_url: schedule.subscription_url }),
            ...(schedule.comments_count !== undefined && { comments_count: schedule.comments_count }),
            ...(schedule.comments_url !== undefined && { comments_url: schedule.comments_url }),
            ...(schedule.parent !== undefined && {
                parent: {
                    id: schedule.parent.id,
                    ...(schedule.parent.title !== undefined && { title: schedule.parent.title }),
                    ...(schedule.parent.type !== undefined && { type: schedule.parent.type }),
                    ...(schedule.parent.url !== undefined && { url: schedule.parent.url }),
                    ...(schedule.parent.app_url !== undefined && { app_url: schedule.parent.app_url })
                }
            }),
            ...(schedule.bucket !== undefined && {
                bucket: {
                    id: schedule.bucket.id,
                    ...(schedule.bucket.name !== undefined && { name: schedule.bucket.name }),
                    ...(schedule.bucket.type !== undefined && { type: schedule.bucket.type })
                }
            }),
            ...(schedule.creator != null && {
                creator: {
                    id: schedule.creator.id,
                    ...(schedule.creator.attachable_sgid != null && { attachable_sgid: schedule.creator.attachable_sgid }),
                    ...(schedule.creator.name != null && { name: schedule.creator.name }),
                    ...(schedule.creator.email_address != null && { email_address: schedule.creator.email_address }),
                    ...(schedule.creator.personable_type != null && { personable_type: schedule.creator.personable_type }),
                    ...(schedule.creator.title != null && { title: schedule.creator.title }),
                    ...(schedule.creator.bio != null && { bio: schedule.creator.bio }),
                    ...(schedule.creator.location != null && { location: schedule.creator.location }),
                    ...(schedule.creator.created_at != null && { created_at: schedule.creator.created_at }),
                    ...(schedule.creator.updated_at != null && { updated_at: schedule.creator.updated_at }),
                    ...(schedule.creator.admin != null && { admin: schedule.creator.admin }),
                    ...(schedule.creator.owner != null && { owner: schedule.creator.owner }),
                    ...(schedule.creator.client != null && { client: schedule.creator.client }),
                    ...(schedule.creator.employee != null && { employee: schedule.creator.employee }),
                    ...(schedule.creator.time_zone != null && { time_zone: schedule.creator.time_zone }),
                    ...(schedule.creator.avatar_url != null && { avatar_url: schedule.creator.avatar_url }),
                    ...(schedule.creator.company != null && {
                        company: {
                            id: schedule.creator.company.id,
                            ...(schedule.creator.company.name != null && { name: schedule.creator.company.name })
                        }
                    }),
                    ...(schedule.creator.can_manage_projects != null && { can_manage_projects: schedule.creator.can_manage_projects }),
                    ...(schedule.creator.can_manage_people != null && { can_manage_people: schedule.creator.can_manage_people })
                }
            }),
            ...(schedule.include_due_assignments !== undefined && { include_due_assignments: schedule.include_due_assignments }),
            ...(schedule.entries_count !== undefined && { entries_count: schedule.entries_count }),
            ...(schedule.entries_url !== undefined && { entries_url: schedule.entries_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
