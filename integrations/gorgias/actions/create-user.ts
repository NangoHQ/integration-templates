import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Full name of the user. Example: "Jane Doe"'),
        email: z.string().describe('Email address of the user. Example: "jane@example.com"'),
        role: z.string().optional().describe('Role name for the user. Defaults to "agent" if not provided. Example: "admin"')
    })
    .describe('Input to create a new Gorgias user.');

const ProviderUserSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    role: z.object({
        name: z.string()
    })
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created user. Example: "519543243"'),
        name: z.string().describe('Full name of the created user.'),
        email: z.string().describe('Email address of the created user.'),
        role: z.string().describe('Role name assigned to the user. Example: "agent"')
    })
    .describe('Created Gorgias user data.');

/**
 * @tags: [write]
 * @tagReason: Creates a new user in the Gorgias account.
 * @pitfalls: Requires the `users:write` scope; the provider rejects an email already assigned to another user.
 */
const action = createAction({
    description: 'Create a new user with a role in Gorgias. Defaults to agent if a role is not provided.',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.gorgias.com/reference/create-user
            endpoint: '/api/users',
            data: {
                name: input.name,
                email: input.email,
                role: {
                    name: input.role || 'agent'
                }
            },
            retries: 10
        });

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: String(providerUser.id),
            name: providerUser.name,
            email: providerUser.email,
            role: providerUser.role.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
