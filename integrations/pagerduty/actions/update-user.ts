import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the user to update. Example: "PJB72P3"'),
        name: z.string().optional().describe('The name of the user.'),
        email: z.string().optional().describe('The email address of the user.'),
        job_title: z.string().nullable().optional().describe('The job title of the user. Pass null to clear.'),
        role: z
            .string()
            .optional()
            .describe('The role of the user. Must be an internal API slug such as "user", "admin", or "observer". UI labels like "responder" are rejected.'),
        time_zone: z.string().optional().describe('The time zone preference of the user, e.g. "America/New_York".'),
        description: z.string().nullable().optional().describe('A description of the user. Pass null to clear.'),
        color: z.string().optional().describe('The color theme preference of the user, e.g. "green".')
    })
    .describe('Fields to update on an existing PagerDuty user.');

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    job_title: z.string().nullable().optional(),
    role: z.string().optional(),
    time_zone: z.string().optional(),
    description: z.string().nullable().optional(),
    color: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the updated user.'),
        name: z.string().optional().describe('The name of the user.'),
        email: z.string().optional().describe('The email address of the user.'),
        job_title: z.string().optional().describe('The job title of the user.'),
        role: z.string().optional().describe('The role of the user.'),
        time_zone: z.string().optional().describe('The time zone preference of the user.'),
        description: z.string().optional().describe('A description of the user.'),
        color: z.string().optional().describe('The color theme preference of the user.')
    })
    .describe('The updated PagerDuty user record.');

/**
 * @tags: [write]
 * @tagReason: Sends a PUT request to mutate a user record on the provider.
 * @pitfalls: The role field must be an internal API slug such as "user", "admin", or "observer"; UI-facing labels like "responder" are rejected.
 */
const action = createAction({
    description: "Update a user's fields (name, job title, role, time zone, etc).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        type UserUpdateBody = {
            type: string;
            name?: string;
            email?: string;
            job_title?: string | null;
            role?: string;
            time_zone?: string;
            description?: string | null;
            color?: string;
        };

        const requestBody: UserUpdateBody = {
            type: 'user'
        };

        if (input.name !== undefined) {
            requestBody.name = input.name;
        }
        if (input.email !== undefined) {
            requestBody.email = input.email;
        }
        if (input.job_title !== undefined) {
            requestBody.job_title = input.job_title;
        }
        if (input.role !== undefined) {
            requestBody.role = input.role;
        }
        if (input.time_zone !== undefined) {
            requestBody.time_zone = input.time_zone;
        }
        if (input.description !== undefined) {
            requestBody.description = input.description;
        }
        if (input.color !== undefined) {
            requestBody.color = input.color;
        }

        const response = await nango.put({
            // https://developer.pagerduty.com/api-reference/ce6799fc6191a-update-a-user
            endpoint: `/users/${encodeURIComponent(input.id)}`,
            data: {
                user: requestBody
            },
            retries: 3
        });

        const responseData = z.object({ user: ProviderUserSchema }).parse(response.data);
        const providerUser = responseData.user;

        return {
            id: providerUser.id,
            ...(providerUser.name !== undefined && { name: providerUser.name }),
            ...(providerUser.email !== undefined && { email: providerUser.email }),
            ...(providerUser.job_title != null && { job_title: providerUser.job_title }),
            ...(providerUser.role !== undefined && { role: providerUser.role }),
            ...(providerUser.time_zone !== undefined && { time_zone: providerUser.time_zone }),
            ...(providerUser.description != null && { description: providerUser.description }),
            ...(providerUser.color !== undefined && { color: providerUser.color })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
