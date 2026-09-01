import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required for fetching the current user profile.');

const CompanySchema = z.object({
    id: z.number().describe('Company ID.'),
    name: z.string().describe('Company name.')
});

const OutOfOfficeSchema = z.object({
    start_date: z.string().describe('Out-of-office start date in ISO 8601 format (YYYY-MM-DD).'),
    end_date: z.string().describe('Out-of-office end date in ISO 8601 format (YYYY-MM-DD).')
});

const ProviderPersonSchema = z.object({
    id: z.number(),
    attachable_sgid: z.string(),
    name: z.string(),
    personable_type: z.string(),
    title: z.string().nullable().optional(),
    tagline: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    email_address: z.string(),
    bio: z.string().nullable().optional(),
    admin: z.boolean(),
    owner: z.boolean(),
    client: z.boolean(),
    employee: z.boolean(),
    time_zone: z.string(),
    avatar_url: z.string(),
    company: CompanySchema.nullable().optional(),
    can_ping: z.boolean(),
    can_manage_projects: z.boolean(),
    can_manage_people: z.boolean(),
    can_access_timesheet: z.boolean(),
    can_access_hill_charts: z.boolean(),
    out_of_office: OutOfOfficeSchema.nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Person ID.'),
        attachable_sgid: z.string().describe('Attachable SGID for referencing this person in rich content.'),
        name: z.string().describe('Display name.'),
        personable_type: z.string().describe('Type of person entity, usually "User".'),
        title: z.string().optional().describe('Job title.'),
        tagline: z.string().optional().describe('Short tagline or motto.'),
        location: z.string().optional().describe('Physical location.'),
        created_at: z.string().describe('ISO 8601 timestamp when the person was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the person was last updated.'),
        email_address: z.string().describe('Email address.'),
        bio: z.string().optional().describe('Short biography.'),
        admin: z.boolean().describe('Whether the person is an account administrator.'),
        owner: z.boolean().describe('Whether the person is the account owner.'),
        client: z.boolean().describe('Whether the person is a client.'),
        employee: z.boolean().describe('Whether the person is an employee.'),
        time_zone: z.string().describe('Time zone name.'),
        avatar_url: z.string().describe("URL to the person's avatar image."),
        company: CompanySchema.optional().describe('Company the person belongs to.'),
        can_ping: z.boolean().describe('Whether the person can be pinged.'),
        can_manage_projects: z.boolean().describe('Whether the person can manage projects.'),
        can_manage_people: z.boolean().describe('Whether the person can manage people.'),
        can_access_timesheet: z.boolean().describe('Whether the person can access timesheets.'),
        can_access_hill_charts: z.boolean().describe('Whether the person can access Hill Charts.'),
        out_of_office: OutOfOfficeSchema.optional().describe('Out-of-office status if currently enabled.')
    })
    .describe('Profile of the current Basecamp user.');

/**
 * @tags: [read]
 * @tagReason: Reads the current token owner's profile from the Basecamp API.
 */
const action = createAction({
    description: "Get the current token owner's own profile.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://github.com/basecamp/bc3-api/blob/master/sections/people.md#get-my-personal-info
            endpoint: '/my/profile.json',
            retries: 3
        });

        const raw = response.data;

        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Basecamp API while fetching profile.'
            });
        }

        const provider = ProviderPersonSchema.parse(raw);

        return {
            id: provider.id,
            attachable_sgid: provider.attachable_sgid,
            name: provider.name,
            personable_type: provider.personable_type,
            created_at: provider.created_at,
            updated_at: provider.updated_at,
            email_address: provider.email_address,
            admin: provider.admin,
            owner: provider.owner,
            client: provider.client,
            employee: provider.employee,
            time_zone: provider.time_zone,
            avatar_url: provider.avatar_url,
            can_ping: provider.can_ping,
            can_manage_projects: provider.can_manage_projects,
            can_manage_people: provider.can_manage_people,
            can_access_timesheet: provider.can_access_timesheet,
            can_access_hill_charts: provider.can_access_hill_charts,
            ...(provider.title != null && { title: provider.title }),
            ...(provider.tagline != null && { tagline: provider.tagline }),
            ...(provider.location != null && { location: provider.location }),
            ...(provider.bio != null && { bio: provider.bio }),
            ...(provider.company != null && { company: provider.company }),
            ...(provider.out_of_office != null && { out_of_office: provider.out_of_office })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
