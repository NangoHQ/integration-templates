import { z } from 'zod';
import { createAction } from 'nango';

const CreatePersonSchema = z.object({
    name: z.string().describe('Full name of the person to invite.'),
    email_address: z.string().describe('Email address of the person to invite.'),
    title: z.string().optional().describe('Job title of the person to invite.'),
    company_name: z.string().optional().describe('Company name of the person to invite.')
});

const InputSchema = z
    .object({
        projectId: z.number().describe('Basecamp project ID to update access for.'),
        grant: z.array(z.number()).optional().describe('Array of existing person IDs to grant access to the project.'),
        revoke: z.array(z.number()).optional().describe('Array of existing person IDs to revoke access from the project.'),
        create: z.array(CreatePersonSchema).optional().describe('Array of new people to create and grant access to the project.')
    })
    .describe('Parameters for updating who can access a Basecamp project.');

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
    email_address: z.string().nullable().optional(),
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
        .nullable()
        .optional(),
    can_ping: z.boolean(),
    can_manage_projects: z.boolean(),
    can_manage_people: z.boolean(),
    can_access_timesheet: z.boolean(),
    can_access_hill_charts: z.boolean()
});

const PublicPersonSchema = z.object({
    id: z.number().describe('Unique identifier for the person.'),
    attachable_sgid: z.string().optional().describe('Attachable SGID for embedding in rich text.'),
    name: z.string().describe('Full name of the person.'),
    personable_type: z.string().optional().describe('Type of person entity, typically "User".'),
    title: z.string().optional().describe('Job title of the person.'),
    tagline: z.string().optional().describe('Short personal tagline or motto.'),
    location: z.string().optional().describe('Geographic location of the person.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the person was created.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the person was last updated.'),
    email_address: z.string().optional().describe('Email address; may be redacted for non-admin callers.'),
    bio: z.string().optional().describe('Short biography of the person.'),
    admin: z.boolean().optional().describe('Whether the person is an account administrator.'),
    owner: z.boolean().optional().describe('Whether the person is the account owner.'),
    client: z.boolean().optional().describe('Whether the person is a client user.'),
    employee: z.boolean().optional().describe('Whether the person is an employee.'),
    time_zone: z.string().optional().describe('Time zone of the person.'),
    avatar_url: z.string().optional().describe("URL to the person's avatar image."),
    company: z
        .object({
            id: z.number().describe('Company identifier.'),
            name: z.string().describe('Company name.')
        })
        .optional()
        .describe('Company the person belongs to.'),
    can_ping: z.boolean().optional().describe('Whether the current user can ping this person.'),
    can_manage_projects: z.boolean().optional().describe('Whether the person can manage projects.'),
    can_manage_people: z.boolean().optional().describe('Whether the person can manage people.'),
    can_access_timesheet: z.boolean().optional().describe('Whether the person can access timesheets.'),
    can_access_hill_charts: z.boolean().optional().describe('Whether the person can access Hill Charts.')
});

const OutputSchema = z
    .object({
        granted: z.array(PublicPersonSchema).optional().describe('People who were newly granted access to the project.'),
        revoked: z.array(PublicPersonSchema).optional().describe('People whose access to the project was revoked.')
    })
    .describe('Result of updating project access, listing people who were granted or revoked.');

function normalizePerson(person: z.infer<typeof ProviderPersonSchema>): z.infer<typeof PublicPersonSchema> {
    return {
        id: person.id,
        attachable_sgid: person.attachable_sgid,
        name: person.name,
        personable_type: person.personable_type,
        ...(person.title !== null && { title: person.title }),
        ...(person.tagline !== null && { tagline: person.tagline }),
        ...(person.location !== null && { location: person.location }),
        created_at: person.created_at,
        updated_at: person.updated_at,
        ...(person.email_address !== null && person.email_address !== undefined && { email_address: person.email_address }),
        ...(person.bio !== null && { bio: person.bio }),
        admin: person.admin,
        owner: person.owner,
        client: person.client,
        employee: person.employee,
        time_zone: person.time_zone,
        avatar_url: person.avatar_url,
        ...(person.company !== null && person.company !== undefined && { company: person.company }),
        can_ping: person.can_ping,
        can_manage_projects: person.can_manage_projects,
        can_manage_people: person.can_manage_people,
        can_access_timesheet: person.can_access_timesheet,
        can_access_hill_charts: person.can_access_hill_charts
    };
}

/**
 * @tags: [write, destructive]
 * @tagReason: Grants, revokes, or creates-and-grants project access. Revoking access is a destructive provider effect.
 * @pitfalls: Granting or revoking a person whose access state is already correct, or creating a person with an existing email address, returns empty arrays instead of an error. email_address may be redacted for non-admin callers.
 */
const action = createAction({
    description: "Grant, revoke, or create-and-grant people's access to a project.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.grant && !input.revoke && !input.create) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of grant, revoke, or create must be provided.'
            });
        }

        const body: Record<string, unknown> = {};
        if (input.grant !== undefined) {
            body['grant'] = input.grant;
        }
        if (input.revoke !== undefined) {
            body['revoke'] = input.revoke;
        }
        if (input.create !== undefined) {
            body['create'] = input.create;
        }

        // https://github.com/basecamp/bc3-api/blob/master/sections/people.md#update-who-can-access-a-project
        const response = await nango.put({
            endpoint: `/projects/${encodeURIComponent(input.projectId)}/people/users.json`,
            data: body,
            retries: 3
        });

        const rawResponse = z
            .object({
                granted: z.array(ProviderPersonSchema).optional(),
                revoked: z.array(ProviderPersonSchema).optional()
            })
            .parse(response.data);

        return {
            ...(rawResponse.granted !== undefined && {
                granted: rawResponse.granted.map(normalizePerson)
            }),
            ...(rawResponse.revoked !== undefined && {
                revoked: rawResponse.revoked.map(normalizePerson)
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
