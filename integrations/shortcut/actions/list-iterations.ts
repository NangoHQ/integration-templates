import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderIterationSchema = z
    .object({
        app_url: z.string().optional(),
        created_at: z.string().optional(),
        end_date: z.string().optional(),
        entity_type: z.string().optional(),
        follower_ids: z.array(z.string()).optional(),
        group_ids: z.array(z.string()).optional(),
        group_mention_ids: z.array(z.string()).optional(),
        id: z.number(),
        label_ids: z.array(z.number()).optional(),
        labels: z.array(z.unknown()).optional(),
        member_mention_ids: z.array(z.string()).optional(),
        mention_ids: z.array(z.string()).optional(),
        name: z.string().optional(),
        start_date: z.string().optional(),
        stats: z.record(z.string(), z.unknown()).optional(),
        status: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderIterationSchema)
});

const action = createAction({
    description: 'List iterations (sprints).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shortcut.com/api/rest/v3
            endpoint: '/api/v3/iterations',
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected a flat array of iterations from the Shortcut API.'
            });
        }

        const iterations = z.array(ProviderIterationSchema).parse(response.data);

        return {
            items: iterations
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
