import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required for listing all people on the account.');

const CompanySchema = z
    .object({
        id: z.number().describe('Company ID.'),
        name: z.string().describe('Company name.')
    })
    .describe('Company associated with a person.');

const ProviderCompanySchema = z.object({
    id: z.number(),
    name: z.string()
});

const ProviderPersonSchema = z.object({
    id: z.number(),
    name: z.string(),
    email_address: z.string().nullable().optional(),
    personable_type: z.string(),
    title: z.string().nullable().optional(),
    tagline: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    admin: z.boolean(),
    owner: z.boolean(),
    client: z.boolean(),
    employee: z.boolean(),
    time_zone: z.string(),
    avatar_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    company: ProviderCompanySchema.nullable().optional(),
    can_ping: z.boolean(),
    can_manage_projects: z.boolean(),
    can_manage_people: z.boolean(),
    can_access_timesheet: z.boolean(),
    can_access_hill_charts: z.boolean()
});

const PersonSchema = z
    .object({
        id: z.number().describe('Person ID.'),
        name: z.string().describe('Full name of the person.'),
        email_address: z.string().optional().describe('Email address; redacted for non-admins and users other than the person themselves.'),
        personable_type: z.string().describe('Type of person record, typically "User".'),
        title: z.string().optional().describe('Job title.'),
        tagline: z.string().optional().describe('Short tagline or motto.'),
        location: z.string().optional().describe('Geographic location.'),
        bio: z.string().optional().describe('Short biography.'),
        admin: z.boolean().describe('Whether the person is an account administrator.'),
        owner: z.boolean().describe('Whether the person is the account owner.'),
        client: z.boolean().describe('Whether the person is a client user.'),
        employee: z.boolean().describe('Whether the person is an employee.'),
        time_zone: z.string().describe('Time zone name.'),
        avatar_url: z.string().describe("URL to the person's avatar image."),
        created_at: z.string().describe('ISO 8601 timestamp when the person was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the person was last updated.'),
        company: CompanySchema.optional().describe('Company information.'),
        can_ping: z.boolean().describe('Whether the current user can ping this person.'),
        can_manage_projects: z.boolean().describe('Whether the person can manage projects.'),
        can_manage_people: z.boolean().describe('Whether the person can manage people.'),
        can_access_timesheet: z.boolean().describe('Whether the person can access timesheets.'),
        can_access_hill_charts: z.boolean().describe('Whether the person can access hill charts.')
    })
    .describe('A person visible to the current user on the Basecamp account.');

const OutputSchema = z
    .object({
        items: z.array(PersonSchema).describe('All people visible to the current user across the account.')
    })
    .describe('List of all people visible to the current user across the Basecamp account.');

/**
 * @tags: [read]
 * @tagReason: Performs a read-only GET request to the Basecamp people endpoint.
 * @pitfalls: email_address is redacted for everyone except account admins/owners and the person themselves; the list may include integration accounts with sparse profile data.
 */
const action = createAction({
    description: 'List all people visible to the current user across the whole account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const allPeople: Array<unknown> = [];

        // https://github.com/basecamp/bc3-api/blob/master/sections/people.md#get-all-people
        for await (const page of nango.paginate<unknown>({
            endpoint: '/people.json',
            retries: 3,
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next'
            }
        })) {
            allPeople.push(...page);
        }

        const items = allPeople.map((raw) => {
            const person = ProviderPersonSchema.parse(raw);
            return {
                id: person.id,
                name: person.name,
                ...(person.email_address != null && { email_address: person.email_address }),
                personable_type: person.personable_type,
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
                ...(person.company != null && { company: person.company }),
                can_ping: person.can_ping,
                can_manage_projects: person.can_manage_projects,
                can_manage_people: person.can_manage_people,
                can_access_timesheet: person.can_access_timesheet,
                can_access_hill_charts: person.can_access_hill_charts
            };
        });

        return { items };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
