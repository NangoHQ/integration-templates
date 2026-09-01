import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project to list people for.')
    })
    .describe('Input parameters for listing people on a Basecamp project.');

const CompanySchema = z.object({
    id: z.number().describe('The unique ID of the company.'),
    name: z.string().describe('The name of the company.')
});

const ProviderCompanySchema = z.object({
    id: z.number(),
    name: z.string()
});

const ProviderPersonSchema = z.object({
    id: z.number(),
    name: z.string(),
    email_address: z.string().nullable().optional(),
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

const PersonSchema = z.object({
    id: z.number().describe('The unique ID of the person.'),
    name: z.string().describe('The display name of the person.'),
    email_address: z.string().optional().describe('The email address of the person, omitted if the person has none. Redacted for non-admins.'),
    title: z.string().optional().describe('The job title of the person.'),
    tagline: z.string().optional().describe('The personal tagline or motto of the person.'),
    location: z.string().optional().describe('The geographic location of the person.'),
    bio: z.string().optional().describe('The short biography of the person.'),
    admin: z.boolean().describe('Whether the person is an account administrator.'),
    owner: z.boolean().describe('Whether the person is the account owner.'),
    client: z.boolean().describe('Whether the person is a client.'),
    employee: z.boolean().describe('Whether the person is an employee.'),
    time_zone: z.string().describe('The time zone of the person (e.g. America/Chicago).'),
    avatar_url: z.string().describe("The URL of the person's avatar image."),
    created_at: z.string().describe('The ISO 8601 timestamp when the person was created.'),
    updated_at: z.string().describe('The ISO 8601 timestamp when the person was last updated.'),
    company: CompanySchema.optional().describe('The company the person belongs to.'),
    can_ping: z.boolean().describe('Whether the person can be pinged.'),
    can_manage_projects: z.boolean().describe('Whether the person can manage projects.'),
    can_manage_people: z.boolean().describe('Whether the person can manage other people.'),
    can_access_timesheet: z.boolean().describe('Whether the person can access timesheets.'),
    can_access_hill_charts: z.boolean().describe('Whether the person can access hill charts.')
});

const OutputSchema = z.array(PersonSchema).describe('The list of people who have access to the specified project.');

function normalizePerson(person: z.infer<typeof ProviderPersonSchema>): z.infer<typeof PersonSchema> {
    return {
        id: person.id,
        name: person.name,
        ...(person.email_address != null && { email_address: person.email_address }),
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
}

/**
 * @tags: [read]
 * @tagReason: Reads the list of people who have access to a specific project.
 * @pitfalls: Email addresses are redacted for non-admin callers and for anyone other than the person themselves, so the returned value may contain bullet characters instead of a full address.
 */
const action = createAction({
    description: 'List the people who have access to a specific project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const people: z.infer<typeof PersonSchema>[] = [];

        // https://github.com/basecamp/bc3-api/blob/master/sections/people.md#get-people-on-a-project
        for await (const page of nango.paginate({
            endpoint: `/projects/${encodeURIComponent(input.projectId)}/people.json`,
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next'
            },
            retries: 3
        })) {
            const pageData = z.array(ProviderPersonSchema).safeParse(page);
            if (!pageData.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'The provider returned an unexpected response shape.',
                    details: pageData.error.message
                });
            }
            people.push(...pageData.data.map(normalizePerson));
        }

        return people;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
