import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderPersonSchema = z.object({
    id: z.number(),
    attachable_sgid: z.string(),
    name: z.string(),
    personable_type: z.string(),
    title: z.string().nullable(),
    tagline: z.string().nullable(),
    location: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    email_address: z.string().nullable(),
    bio: z.string().nullable(),
    admin: z.boolean(),
    owner: z.boolean(),
    client: z.boolean(),
    employee: z.boolean(),
    time_zone: z.string(),
    avatar_url: z.string(),
    company: z
        .object({
            id: z.number(),
            name: z.string()
        })
        .nullish(),
    can_ping: z.boolean(),
    can_manage_projects: z.boolean(),
    can_manage_people: z.boolean(),
    can_access_timesheet: z.boolean(),
    can_access_hill_charts: z.boolean()
});

const CompanySchema = z
    .object({
        id: z.number().describe('Unique identifier for the company'),
        name: z.string().describe('Name of the company')
    })
    .describe('Company information for the person');

const PersonSchema = z
    .object({
        id: z.string().describe('Unique identifier for the person'),
        attachable_sgid: z.string().describe('Signed global ID for attaching the person to other records'),
        name: z.string().describe('Display name of the person'),
        personable_type: z.string().describe('Type of personable entity (e.g., User, Integration)'),
        title: z.string().optional().describe('Job title of the person'),
        tagline: z.string().optional().describe('Personal tagline or motto'),
        location: z.string().optional().describe('Geographic location of the person'),
        created_at: z.string().describe('ISO 8601 timestamp when the person was created'),
        updated_at: z.string().describe('ISO 8601 timestamp when the person was last updated'),
        email_address: z.string().optional().describe('Email address of the person (may be redacted for non-admins)'),
        bio: z.string().optional().describe('Short biography of the person'),
        admin: z.boolean().describe('Whether the person is an account administrator'),
        owner: z.boolean().describe('Whether the person is the account owner'),
        client: z.boolean().describe('Whether the person is a client user'),
        employee: z.boolean().describe('Whether the person is an employee'),
        time_zone: z.string().describe('IANA time zone of the person'),
        avatar_url: z.string().describe('URL to the persons avatar image'),
        company: CompanySchema.optional().describe('Company information for the person'),
        can_ping: z.boolean().describe('Whether the current user can ping this person'),
        can_manage_projects: z.boolean().describe('Whether the person can manage projects'),
        can_manage_people: z.boolean().describe('Whether the person can manage people'),
        can_access_timesheet: z.boolean().describe('Whether the person can access timesheets'),
        can_access_hill_charts: z.boolean().describe('Whether the person can access hill charts')
    })
    .describe('A person on the Basecamp account');

const CheckpointSchema = z.object({
    next_page_url: z.string().describe('Absolute next-page URL to resume an interrupted full-refresh crawl.')
});

function parseCheckpointUrl(url: string): { baseUrlOverride: string | undefined; endpoint: string } {
    // @allowTryCatch
    try {
        const parsed = new URL(url);
        return {
            baseUrlOverride: parsed.origin,
            endpoint: parsed.pathname + parsed.search
        };
    } catch {
        return {
            baseUrlOverride: undefined,
            endpoint: url
        };
    }
}

const sync = createSync({
    description: 'Sync people (account-wide, not scoped to any one project)',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Person: PersonSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint != null ? CheckpointSchema.parse(rawCheckpoint) : null;
        const { baseUrlOverride, endpoint } = checkpoint?.next_page_url
            ? parseCheckpointUrl(checkpoint.next_page_url)
            : { baseUrlOverride: undefined, endpoint: '/people.json' };
        let nextPageUrl: string | undefined = checkpoint?.next_page_url;

        await nango.trackDeletesStart('Person');

        const proxyConfig: ProxyConfiguration = {
            // https://github.com/basecamp/bc3-api/blob/master/sections/people.md#get-all-people
            endpoint,
            ...(baseUrlOverride && { baseUrlOverride }),
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextPageUrl = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const people = pageResults.map((raw) => {
                const parsed = ProviderPersonSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse person: ${parsed.error.message}`);
                }

                const record = parsed.data;
                return {
                    id: String(record.id),
                    attachable_sgid: record.attachable_sgid,
                    name: record.name,
                    personable_type: record.personable_type,
                    ...(record.title != null && { title: record.title }),
                    ...(record.tagline != null && { tagline: record.tagline }),
                    ...(record.location != null && { location: record.location }),
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                    ...(record.email_address != null && { email_address: record.email_address }),
                    ...(record.bio != null && { bio: record.bio }),
                    admin: record.admin,
                    owner: record.owner,
                    client: record.client,
                    employee: record.employee,
                    time_zone: record.time_zone,
                    avatar_url: record.avatar_url,
                    ...(record.company != null && { company: record.company }),
                    can_ping: record.can_ping,
                    can_manage_projects: record.can_manage_projects,
                    can_manage_people: record.can_manage_people,
                    can_access_timesheet: record.can_access_timesheet,
                    can_access_hill_charts: record.can_access_hill_charts
                };
            });

            if (people.length > 0) {
                await nango.batchSave(people, 'Person');
            }

            if (nextPageUrl) {
                await nango.saveCheckpoint({ next_page_url: nextPageUrl });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Person');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
