import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    trainingRecordId: z.number().describe('The ID of the training record to delete. Example: 123')
});

const OutputSchema = z.object({
    success: z.boolean(),
    trainingRecordId: z.number()
});

const action = createAction({
    description: 'Delete a training record from an employee in BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-employee-training',
        group: 'Training'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://documentation.bamboohr.com/reference/delete-employee-training-record
            endpoint: `v1/training/record/${encodeURIComponent(String(input.trainingRecordId))}`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- Delete is non-idempotent; avoid retries
            retries: 0
        });

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete training record. Received status ${response.status}.`,
                trainingRecordId: input.trainingRecordId
            });
        }

        return {
            success: true,
            trainingRecordId: input.trainingRecordId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
