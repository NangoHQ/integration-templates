import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const TeamSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        permissions: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const ListTeamsOutputSchema = z.object({
    entries: z.array(TeamSchema),
    pagination: z
        .object({
            current_page: z.number().optional(),
            total_pages: z.number().optional(),
            total_entries: z.number().optional(),
            per_page: z.number().optional()
        })
        .optional()
});

const action = createAction({
    description: 'List teams in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: ListTeamsOutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof ListTeamsOutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: 'api/v3/admin/teams',
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from teams endpoint'
            });
        }

        const parsed = ListTeamsOutputSchema.parse(raw);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
