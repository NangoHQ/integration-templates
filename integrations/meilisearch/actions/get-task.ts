import { z } from 'zod';
import { createAction } from 'nango';

import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    taskUid: z.number().describe('Uid of the async task returned by a write operation.')
});

const OutputSchema = z
    .object({
        uid: z.number(),
        indexUid: z.string().nullable(),
        status: z.string(),
        type: z.string(),
        error: z.unknown().nullable().optional(),
        enqueuedAt: z.string(),
        startedAt: z.string().nullable().optional(),
        finishedAt: z.string().nullable().optional()
    })
    .catchall(z.unknown());

const action = createAction({
    description: 'Fetch the status of a Meilisearch async task by its uid.',
    version: '1.0.0',
    scopes: ['tasks.get'],

    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: InputSchema, input });

        const config: ProxyConfiguration = {
            // https://www.meilisearch.com/docs/reference/api/tasks#get-one-task
            endpoint: `/tasks/${parsedInput.data.taskUid}`,
            retries: 3
        };

        const response = await nango.get(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
