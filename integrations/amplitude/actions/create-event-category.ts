import { URLSearchParams } from 'url';
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category_name: z.string().describe('Name of the event category. Example: "Registration"')
});

const PostResponseSchema = z.object({
    success: z.boolean(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const GetResponseSchema = z.object({
    success: z.boolean(),
    data: z
        .object({
            id: z.number(),
            name: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string()
});

const action = createAction({
    description: 'Create an event category in Amplitude taxonomy.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-event-category',
        group: 'Taxonomy'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://amplitude.com/docs/apis/analytics/taxonomy#create-event-category
        const postResponse = await nango.post({
            endpoint: '/api/2/taxonomy/category',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: new URLSearchParams({ category_name: input.category_name }).toString(),
            retries: 3
        });

        const parsedPost = PostResponseSchema.parse(postResponse.data);
        if (!parsedPost.success) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: parsedPost.errors?.[0]?.message || 'Failed to create event category',
                category_name: input.category_name
            });
        }

        // https://amplitude.com/docs/apis/analytics/taxonomy#get-an-event-category
        const getResponse = await nango.get({
            endpoint: `/api/2/taxonomy/category/${encodeURIComponent(input.category_name)}`,
            retries: 3
        });

        const parsedGet = GetResponseSchema.parse(getResponse.data);
        if (!parsedGet.success || !parsedGet.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Created category could not be retrieved',
                category_name: input.category_name
            });
        }

        return {
            id: parsedGet.data.id,
            name: parsedGet.data.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
