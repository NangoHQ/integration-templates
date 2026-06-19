import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const UserSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    organizations: z.array(z.unknown()).optional()
});

const OutputSchema = z.array(UserSchema);

const action = createAction({
    description: 'List all users in the organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const users: z.infer<typeof UserSchema>[] = [];
        let skip = 0;
        const limit = 200;

        while (true) {
            const response = await nango.get({
                // https://developer.close.com/
                endpoint: '/v1/user/',
                params: {
                    _skip: String(skip),
                    _limit: String(limit)
                },
                retries: 3
            });

            const body = response.data;
            if (typeof body !== 'object' || body === null || !Array.isArray(body.data)) {
                throw new Error(`Unexpected response shape from Close /v1/user/: ${JSON.stringify(body)}`);
            }

            for (const item of body.data) {
                const user = UserSchema.parse(item);
                users.push(user);
            }

            if (body.has_more !== true) {
                break;
            }

            skip += limit;
        }

        return users;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
