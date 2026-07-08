import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const UserTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
    displayName: z.string(),
    description: z.string().nullable().optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    lastUpdatedBy: z.string().optional(),
    default: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(UserTypeSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List user types/schemas.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.userTypes.read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/schemas/#list-user-types
            endpoint: '/api/v1/meta/types/user',
            retries: 3
        });

        const rawItems = response.data;
        if (!Array.isArray(rawItems)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of user types from the provider.'
            });
        }

        const items = z.array(UserTypeSchema).parse(rawItems);

        return {
            items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
