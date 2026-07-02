import { z } from 'zod';
import { createAction } from 'nango';

const StageSchema = z.object({
    id: z.string(),
    text: z.string(),
    pipeline: z.string(),
    rank: z.number(),
    hasInterview: z.boolean()
});

const ArchiveReasonSchema = z.object({
    id: z.string(),
    text: z.string(),
    type: z.string().nullable(),
    status: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        stages: z.array(StageSchema),
        archiveReasons: z.array(ArchiveReasonSchema)
    })
});

const OutputSchema = z.object({
    stages: z.array(
        z.object({
            id: z.string(),
            text: z.string(),
            pipeline: z.string(),
            rank: z.number(),
            hasInterview: z.boolean()
        })
    ),
    archiveReasons: z.array(
        z.object({
            id: z.string(),
            text: z.string(),
            type: z.string().nullable().optional(),
            status: z.string()
        })
    )
});

const action = createAction({
    description: "Get a combined view of the account's pipeline stages and archive reasons.",
    version: '1.0.0',
    input: z.object({}),
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://hire.lever.co/developer/documentation
        const response = await nango.get({
            endpoint: '/v1/disposition_stages',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No disposition stages data returned from Lever.'
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            stages: parsed.data.stages.map((stage) => ({
                id: stage.id,
                text: stage.text,
                pipeline: stage.pipeline,
                rank: stage.rank,
                hasInterview: stage.hasInterview
            })),
            archiveReasons: parsed.data.archiveReasons.map((reason) => ({
                id: reason.id,
                text: reason.text,
                ...(reason.type !== null && { type: reason.type }),
                status: reason.status
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
