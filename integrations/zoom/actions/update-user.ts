import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The user ID or "me" for the current user. Example: "me"'),
    first_name: z.string().optional().describe("User's first name."),
    last_name: z.string().optional().describe("User's last name."),
    dept: z.string().optional().describe("User's department."),
    company: z.string().optional().describe("User's company."),
    job_title: z.string().optional().describe("User's job title."),
    timezone: z.string().optional().describe('The time zone ID for the user profile.'),
    language: z.string().optional().describe("User's language."),
    location: z.string().optional().describe("User's location."),
    manager: z.string().optional().describe('The manager for the user.'),
    host_key: z.string().optional().describe('Host key. It should be a 6-10 digit number.')
});

const OutputSchema = z.object({
    userId: z.string(),
    updated: z.boolean()
});

const action = createAction({
    description: 'Update a user in Zoom.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:write:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.first_name !== undefined) {
            data['first_name'] = input.first_name;
        }
        if (input.last_name !== undefined) {
            data['last_name'] = input.last_name;
        }
        if (input.dept !== undefined) {
            data['dept'] = input.dept;
        }
        if (input.company !== undefined) {
            data['company'] = input.company;
        }
        if (input.job_title !== undefined) {
            data['job_title'] = input.job_title;
        }
        if (input.timezone !== undefined) {
            data['timezone'] = input.timezone;
        }
        if (input.language !== undefined) {
            data['language'] = input.language;
        }
        if (input.location !== undefined) {
            data['location'] = input.location;
        }
        if (input.manager !== undefined) {
            data['manager'] = input.manager;
        }
        if (input.host_key !== undefined) {
            data['host_key'] = input.host_key;
        }

        const response = await nango.patch({
            // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/userUpdate
            endpoint: `/users/${input.userId}`,
            data,
            retries: 1
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: `Unexpected status code: ${response.status}`
            });
        }

        return {
            userId: input.userId,
            updated: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
