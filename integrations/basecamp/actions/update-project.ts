import { z } from 'zod';
import { createAction } from 'nango';

const ScheduleAttributesSchema = z
    .object({
        start_date: z.string().describe('Project start date (ISO 8601). Both start_date and end_date must be provided together.'),
        end_date: z.string().describe('Project end date (ISO 8601). Both start_date and end_date must be provided together.')
    })
    .describe('Project schedule attributes. Both start_date and end_date are required when provided.');

const InputSchema = z
    .object({
        projectId: z.number().describe('Project ID to update. Example: 48644099'),
        name: z.string().describe('Project name. Must be re-sent even if unchanged.'),
        description: z.string().optional().describe('Project description.'),
        schedule_attributes: ScheduleAttributesSchema.optional(),
        admissions: z
            .enum(['invite', 'employee', 'team'])
            .optional()
            .describe('Project access policy. invite: only invited users; employee: anyone from the account; team: anyone from the account except clients.')
    })
    .describe('Input for updating a Basecamp project.');

const DockToolSchema = z.object({
    id: z.number().describe('Tool ID'),
    title: z.string().describe('Tool title'),
    name: z.string().describe('Tool identifier'),
    enabled: z.boolean().describe('Whether the tool is enabled'),
    position: z.number().nullable().describe('Position in the dock'),
    url: z.string().describe('API URL for the tool'),
    app_url: z.string().describe('App URL for the tool')
});

const PersonSampleSchema = z.object({
    id: z.number().describe('Person ID'),
    name: z.string().describe('Person name'),
    avatar_url: z.string().describe('Avatar URL')
});

const PeopleSchema = z
    .object({
        team: z
            .object({
                count: z.number().describe('Number of team members'),
                sample: z.array(PersonSampleSchema).describe('Sample of team members')
            })
            .passthrough()
            .describe('Team members in the project')
    })
    .passthrough();

const ProjectSchema = z
    .object({
        id: z.number().describe('Project ID'),
        status: z.string().describe('Project status (active, archived, or trashed)'),
        created_at: z.string().describe('Creation timestamp (ISO 8601)'),
        updated_at: z.string().describe('Last update timestamp (ISO 8601)'),
        name: z.string().describe('Project name'),
        description: z.string().nullable().describe('Project description'),
        purpose: z.string().describe('Project purpose'),
        clients_enabled: z.boolean().describe('Whether client access is enabled'),
        timesheet_enabled: z.boolean().describe('Whether timesheets are enabled'),
        color: z.string().nullable().describe('Project color'),
        last_needle_color: z.string().nullable().optional().describe('Last needle color'),
        last_needle_position: z.number().nullable().optional().describe('Last needle position'),
        previous_needle_position: z.number().nullable().optional().describe('Previous needle position'),
        bookmark_url: z.string().describe('Bookmark URL'),
        star_url: z.string().describe('Star URL'),
        url: z.string().describe('API URL for the project'),
        app_url: z.string().describe('App URL for the project'),
        dock: z.array(DockToolSchema).describe('Available tools for this project'),
        people: PeopleSchema.describe('Project people'),
        all_access: z.boolean().describe('Whether all account members have access'),
        client_company: z
            .object({
                id: z.number().describe('Client company ID'),
                name: z.string().describe('Client company name')
            })
            .passthrough()
            .optional()
            .describe('Client company if clients_enabled'),
        clientside: z
            .object({
                url: z.string().describe('Client-side API URL'),
                app_url: z.string().describe('Client-side app URL')
            })
            .passthrough()
            .optional()
            .describe('Client-side links if clients_enabled')
    })
    .passthrough()
    .describe('Updated Basecamp project.');

/**
 * @tags: [write]
 * @tagReason: Mutates project properties via the Basecamp API.
 * @pitfalls: name must always be re-sent even if unchanged; passing a status field is silently ignored and has no effect; schedule_attributes requires both start_date and end_date together.
 */
const action = createAction({
    description: "Update a project's name, description, schedule dates, or access policy.",
    version: '1.0.0',
    input: InputSchema,
    output: ProjectSchema,

    exec: async (nango, input) => {
        const body: Record<string, unknown> = {
            name: input.name
        };

        if (input.description !== undefined) {
            body['description'] = input.description;
        }

        if (input.schedule_attributes !== undefined) {
            body['schedule_attributes'] = input.schedule_attributes;
        }

        if (input.admissions !== undefined) {
            body['admissions'] = input.admissions;
        }

        const response = await nango.put({
            // https://github.com/basecamp/bc3-api/blob/master/sections/projects.md#update-a-project
            endpoint: `/projects/${encodeURIComponent(input.projectId)}.json`,
            data: body,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project not found or could not be updated.'
            });
        }

        const project = ProjectSchema.parse(response.data);
        return project;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
