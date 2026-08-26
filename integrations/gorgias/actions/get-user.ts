import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the user to retrieve. Example: 519543243')
    })
    .describe('Input for retrieving a single Gorgias user by ID.');

const ProviderUserSchema = z
    .object({
        id: z.number(),
        email: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        firstname: z.string().nullable().optional(),
        lastname: z.string().nullable().optional(),
        role: z
            .object({
                name: z.string().nullable().optional()
            })
            .passthrough()
            .nullable()
            .optional(),
        bio: z.string().nullable().optional(),
        created_datetime: z.string().nullable().optional(),
        updated_datetime: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the user.'),
        email: z.string().optional().describe('The email address of the user.'),
        name: z.string().optional().describe('The full name of the user.'),
        firstname: z.string().optional().describe('The first name of the user.'),
        lastname: z.string().optional().describe('The last name of the user.'),
        role: z.string().optional().describe('The role name of the user.'),
        bio: z.string().optional().describe('The bio or description of the user.'),
        created_datetime: z.string().optional().describe('The ISO 8601 datetime when the user was created.'),
        updated_datetime: z.string().optional().describe('The ISO 8601 datetime when the user was last updated.')
    })
    .describe('Output representing a single Gorgias user.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single user by ID from the Gorgias API.
 */
const action = createAction({
    description: 'Retrieve a single user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/get-user
            endpoint: `/api/users/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `User with id ${input.id} not found`
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.email != null && { email: providerUser.email }),
            ...(providerUser.name != null && { name: providerUser.name }),
            ...(providerUser.firstname != null && { firstname: providerUser.firstname }),
            ...(providerUser.lastname != null && { lastname: providerUser.lastname }),
            ...(providerUser.role?.name != null && { role: providerUser.role.name }),
            ...(providerUser.bio != null && { bio: providerUser.bio }),
            ...(providerUser.created_datetime != null && { created_datetime: providerUser.created_datetime }),
            ...(providerUser.updated_datetime != null && { updated_datetime: providerUser.updated_datetime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
