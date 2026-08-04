import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    correctionId: z.string().trim().min(1).describe('The ID of the SLO correction to delete. Example: "c2a34c8a-8f8b-11f1-810a-da7ad0902002"')
});

const OutputSchema = z.object({
    success: z.literal(true)
});

const action = createAction({
    description: 'Permanently delete an SLO correction.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/slo-corrections/#delete-an-slo-correction
        await nango.delete({
            endpoint: `v1/slo/correction/${encodeURIComponent(input.correctionId)}`,
            retries: 10
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
