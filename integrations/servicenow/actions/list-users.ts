import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (sysparm_offset) from the previous response. Omit for the first page.')
});

const ProviderUserSchema = z.object({
    sys_id: z.string(),
    user_name: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    active: z.union([z.boolean(), z.string()]).optional().nullable(),
    sys_created_on: z.string().optional().nullable(),
    sys_updated_on: z.string().optional().nullable()
});

const UserSchema = z.object({
    sys_id: z.string(),
    user_name: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    active: z.boolean().optional(),
    sys_created_on: z.string().optional(),
    sys_updated_on: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(UserSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List sys_user records.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = 100;
        let offset = 0;
        if (input.cursor) {
            const parsedOffset = parseInt(input.cursor, 10);
            if (isNaN(parsedOffset) || parsedOffset < 0) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'Cursor must be a non-negative integer.'
                });
            }
            offset = parsedOffset;
        }

        // https://developer.servicenow.com/dev.do#!/reference/api
        const response = await nango.get({
            endpoint: '/api/now/table/sys_user',
            params: {
                sysparm_limit: String(limit),
                sysparm_offset: String(offset),
                sysparm_fields: 'sys_id,user_name,name,email,active,sys_created_on,sys_updated_on'
            },
            retries: 3
        });

        const rawBody = z.object({ result: z.array(z.unknown()) }).parse(response.data);
        const items = rawBody.result.map((item) => {
            const parsed = ProviderUserSchema.parse(item);
            return {
                sys_id: parsed.sys_id,
                ...(parsed.user_name != null && { user_name: parsed.user_name }),
                ...(parsed.name != null && { name: parsed.name }),
                ...(parsed.email != null && { email: parsed.email }),
                ...(parsed.active != null && { active: parsed.active === true || parsed.active === 'true' }),
                ...(parsed.sys_created_on != null && { sys_created_on: parsed.sys_created_on }),
                ...(parsed.sys_updated_on != null && { sys_updated_on: parsed.sys_updated_on })
            };
        });

        const linkHeader = response.headers['link'];
        const hasNext = typeof linkHeader === 'string' && linkHeader.includes('rel="next"');

        return {
            items,
            ...(hasNext && { next_cursor: String(offset + limit) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
