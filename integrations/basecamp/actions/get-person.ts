import { createAction } from 'nango';
import * as z from 'zod';

const outOfOfficeSchema = z.object({
    start_date: z.string().describe("The date when the person's out-of-office period begins."),
    end_date: z.string().describe("The date when the person's out-of-office period ends.")
});

const companySchema = z.object({
    id: z.number().describe('The unique identifier of the company.'),
    name: z.string().describe('The name of the company.')
});

const personSchema = z
    .object({
        id: z.number().describe('The unique identifier of the person.'),
        attachable_sgid: z.string().describe('The signed global ID for attaching this person to other records.'),
        name: z.string().describe('The full name of the person.'),
        email_address: z.string().optional().describe('The email address of the person, omitted for some integration-type people.'),
        personable_type: z.string().describe('The type of entity, typically "User".'),
        title: z.string().nullable().describe('The job title of the person, if any.'),
        bio: z.string().nullable().describe('The biography or short description of the person, if any.'),
        tagline: z.string().nullable().describe('The short tagline of the person, if any.'),
        location: z.string().nullable().describe('The geographic location of the person, if any.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the person was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the person was last updated.'),
        admin: z.boolean().describe('Whether the person is an admin on the account.'),
        owner: z.boolean().describe('Whether the person is the account owner.'),
        client: z.boolean().describe('Whether the person is a client.'),
        employee: z.boolean().describe('Whether the person is an employee.'),
        time_zone: z.string().describe('The time zone of the person.'),
        avatar_url: z.string().describe("The URL of the person's avatar image."),
        company: companySchema.optional().describe('The company associated with the person, omitted for people without an associated company.'),
        can_ping: z.boolean().describe('Whether the current user can ping this person.'),
        can_manage_projects: z.boolean().describe('Whether the person can manage projects.'),
        can_manage_people: z.boolean().describe('Whether the person can manage people.'),
        can_access_timesheet: z.boolean().describe('Whether the person can access timesheets.'),
        can_access_hill_charts: z.boolean().describe('Whether the person can access hill charts.'),
        out_of_office: outOfOfficeSchema.nullish().describe('Out-of-office details when enabled, otherwise null or undefined.')
    })
    .describe("A single person's profile from Basecamp.");

const inputSchema = z
    .object({
        personId: z.number().describe('The unique identifier of the person to retrieve.')
    })
    .describe('Input for retrieving a single person by ID.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single person's profile from the Basecamp API.
 * @pitfalls: A 404 response may indicate the person does not exist, the caller lacks permission, or the account is inactive.
 */
const action = createAction({
    description: "Retrieve a single person's profile by ID.",
    version: '1.0.0',
    input: inputSchema,
    output: personSchema,

    exec: async (nango, input) => {
        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/people.md
        const response = await nango.get({
            endpoint: `/people/${encodeURIComponent(input.personId)}.json`,
            retries: 3
        });

        const parsed = personSchema.safeParse(response.data);
        if (!parsed.success) {
            await nango.log('Failed to parse person response', { issues: parsed.error.issues });
            throw new Error('Unexpected response shape from Basecamp API');
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
