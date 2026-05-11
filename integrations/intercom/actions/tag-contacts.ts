import { z } from 'zod';
import { createAction } from 'nango';

const UserReferenceSchema = z.object({
    id: z.string().optional().describe('Contact ID. Example: "63f5c5c5c5c5c5c5c5c5c5c5"'),
    email: z.string().optional().describe('Contact email address. Example: "user@example.com"')
});

const InputSchema = z.object({
    name: z.string().describe('Name of the tag to create or use. Example: "VIP Customers"'),
    users: z.array(UserReferenceSchema).describe('Array of contacts to tag, each with id or email')
});

const TaggedUserSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    type: z.string().optional()
});

const ProviderTagSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    users: z.array(TaggedUserSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    tagged_users: z
        .array(
            z.object({
                id: z.string(),
                email: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Apply a tag to one or more contacts',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/tag-contacts',
        group: 'Tags'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write.tags'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.users || input.users.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one user must be provided to tag'
            });
        }

        // Validate that each user has either id or email
        for (const user of input.users) {
            if (!user.id && !user.email) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'Each user must have either an id or email'
                });
            }
        }

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/tags/createtag
        const response = await nango.post({
            endpoint: '/tags',
            headers: {
                'Intercom-Version': '2.11'
            },
            data: {
                name: input.name,
                users: input.users.map((user) => ({
                    ...(user.id !== undefined && { id: user.id }),
                    ...(user.email !== undefined && { email: user.email })
                }))
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to tag contacts - empty response from API'
            });
        }

        const providerTag = ProviderTagSchema.parse(response.data);

        return {
            id: providerTag.id,
            name: providerTag.name,
            type: providerTag.type,
            ...(providerTag.created_at !== undefined && { created_at: providerTag.created_at }),
            ...(providerTag.updated_at !== undefined && { updated_at: providerTag.updated_at }),
            ...(providerTag.users !== undefined && {
                tagged_users: providerTag.users.map((user) => ({
                    id: user.id,
                    ...(user.email !== undefined && { email: user.email })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
