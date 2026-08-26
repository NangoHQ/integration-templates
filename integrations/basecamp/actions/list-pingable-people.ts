import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required.');

const CompanySchema = z.object({
    id: z.number().describe('Company ID.'),
    name: z.string().describe('Company name.')
});

const PersonSchema = z.object({
    id: z.number().describe('Person ID.'),
    name: z.string().describe('Full name.'),
    email_address: z.string().describe('Email address. May be redacted for non-admins.'),
    title: z.string().optional().describe('Job title.'),
    tagline: z.string().optional().describe('Personal tagline or motto.'),
    location: z.string().optional().describe('Geographic location.'),
    bio: z.string().optional().describe('Short biography.'),
    admin: z.boolean().describe('Whether the person is an account admin.'),
    owner: z.boolean().describe('Whether the person is the account owner.'),
    client: z.boolean().describe('Whether the person is a client user.'),
    employee: z.boolean().describe('Whether the person is an employee.'),
    time_zone: z.string().describe('Time zone name.'),
    avatar_url: z.string().describe('URL to the avatar image.'),
    created_at: z.string().describe('ISO 8601 timestamp when the person was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the person was last updated.'),
    can_ping: z.boolean().describe('Whether the person can be pinged.'),
    can_manage_projects: z.boolean().describe('Whether the person can manage projects.'),
    can_manage_people: z.boolean().describe('Whether the person can manage people.'),
    can_access_timesheet: z.boolean().describe('Whether the person can access timesheets.'),
    can_access_hill_charts: z.boolean().describe('Whether the person can access hill charts.'),
    company: CompanySchema.optional().describe('Company information.')
});

const OutputSchema = z
    .object({
        people: z.array(PersonSchema).describe('List of pingable people on the account.')
    })
    .describe('Response containing all pingable people on the account.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of people who can be pinged from the Basecamp API.
 * @pitfalls: May return an empty array even when the account contains people, because pingable people excludes the caller and may require an existing relationship.
 */
const action = createAction({
    description: 'List people on the account who can be pinged (direct messaged).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/people.md#get-pingable-people
            endpoint: '/circles/people.json',
            retries: 3
        });

        const providerPeople = z
            .array(
                z.object({
                    id: z.number(),
                    name: z.string(),
                    email_address: z.string(),
                    title: z.string().nullable(),
                    tagline: z.string().nullable(),
                    location: z.string().nullable(),
                    bio: z.string().nullable(),
                    admin: z.boolean(),
                    owner: z.boolean(),
                    client: z.boolean(),
                    employee: z.boolean(),
                    time_zone: z.string(),
                    avatar_url: z.string(),
                    created_at: z.string(),
                    updated_at: z.string(),
                    can_ping: z.boolean(),
                    can_manage_projects: z.boolean(),
                    can_manage_people: z.boolean(),
                    can_access_timesheet: z.boolean(),
                    can_access_hill_charts: z.boolean(),
                    company: z
                        .object({
                            id: z.number(),
                            name: z.string()
                        })
                        .optional()
                })
            )
            .parse(response.data);

        return {
            people: providerPeople.map((person) => ({
                id: person.id,
                name: person.name,
                email_address: person.email_address,
                ...(person.title != null && { title: person.title }),
                ...(person.tagline != null && { tagline: person.tagline }),
                ...(person.location != null && { location: person.location }),
                ...(person.bio != null && { bio: person.bio }),
                admin: person.admin,
                owner: person.owner,
                client: person.client,
                employee: person.employee,
                time_zone: person.time_zone,
                avatar_url: person.avatar_url,
                created_at: person.created_at,
                updated_at: person.updated_at,
                can_ping: person.can_ping,
                can_manage_projects: person.can_manage_projects,
                can_manage_people: person.can_manage_people,
                can_access_timesheet: person.can_access_timesheet,
                can_access_hill_charts: person.can_access_hill_charts,
                ...(person.company != null && { company: person.company })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
