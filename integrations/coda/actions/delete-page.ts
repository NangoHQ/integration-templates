import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('Doc ID. Example: "L_hgEASd6n"'),
    pageIdOrName: z.string().describe('Page ID or name. Example: "canvas-taIuEN56H1"')
});

const DeleteResponseSchema = z.object({
    id: z.string(),
    requestId: z.string()
});

const MutationStatusSchema = z.object({
    completed: z.boolean()
});

const OutputSchema = z.object({
    id: z.string(),
    requestId: z.string(),
    completed: z.boolean()
});

const action = createAction({
    description: 'Delete a page from a doc.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-page'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://coda.io/developers/apis/v1#operation/delete-page
        const deleteResponse = await nango.delete({
            endpoint: `/docs/${encodeURIComponent(input.docId)}/pages/${encodeURIComponent(input.pageIdOrName)}`,
            retries: 3
        });

        const deleteResult = DeleteResponseSchema.parse(deleteResponse.data);

        const maxPollAttempts = 30;
        let attempts = 0;
        let completed = false;

        while (attempts < maxPollAttempts && !completed) {
            // https://coda.io/developers/apis/v1#operation/get-mutation-status
            // @allowTryCatch Coda returns 404 when a mutation has already completed or expired.
            try {
                const statusResponse = await nango.get({
                    endpoint: `/mutationStatus/${encodeURIComponent(deleteResult.requestId)}`,
                    retries: 3
                });

                if (statusResponse.status === 404 || statusResponse.status === 400) {
                    completed = true;
                    break;
                }

                const statusResult = MutationStatusSchema.parse(statusResponse.data);

                if (statusResult.completed) {
                    completed = true;
                    break;
                }
            } catch (error) {
                const errorRecord = z.object({}).passthrough().safeParse(error);
                if (errorRecord.success) {
                    const record = errorRecord.data;
                    const statusCode = z.number().safeParse(record['statusCode']);
                    if (statusCode.success && (statusCode.data === 404 || statusCode.data === 400)) {
                        completed = true;
                        break;
                    }
                    const status = z.number().safeParse(record['status']);
                    if (status.success && (status.data === 404 || status.data === 400)) {
                        completed = true;
                        break;
                    }
                    const response = z.object({}).passthrough().safeParse(record['response']);
                    if (response.success) {
                        const responseStatus = z.number().safeParse(response.data['status']);
                        if (responseStatus.success && (responseStatus.data === 404 || responseStatus.data === 400)) {
                            completed = true;
                            break;
                        }
                    }
                    const payload = z.object({}).passthrough().safeParse(record['payload']);
                    if (payload.success) {
                        const payloadStatusCode = z.number().safeParse(payload.data['statusCode']);
                        if (payloadStatusCode.success && (payloadStatusCode.data === 404 || payloadStatusCode.data === 400)) {
                            completed = true;
                            break;
                        }
                    }
                }

                throw error;
            }

            attempts += 1;
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (!completed) {
            throw new nango.ActionError({
                type: 'mutation_timeout',
                message: 'Page deletion mutation did not complete within the expected time.',
                requestId: deleteResult.requestId
            });
        }

        return {
            id: deleteResult.id,
            requestId: deleteResult.requestId,
            completed: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
