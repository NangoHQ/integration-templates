import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const StageSchema = z.object({
    slug: z.string(),
    name: z.string(),
    kind: z.string(),
    position: z.number()
});

const OutputSchema = z.object({
    stages: z.array(StageSchema)
});

const action = createAction({
    description: "List the account's recruitment pipeline stages.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workable.readme.io/reference/list-stages
            endpoint: '/spi/v3/stages',
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object' || !('stages' in raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Workable stages endpoint'
            });
        }

        const parsed = z.object({ stages: z.array(z.unknown()) }).parse(raw);
        const stages = parsed.stages.map((item: unknown) => {
            const stage = StageSchema.parse(item);
            return {
                slug: stage.slug,
                name: stage.name,
                kind: stage.kind,
                position: stage.position
            };
        });

        return { stages };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
