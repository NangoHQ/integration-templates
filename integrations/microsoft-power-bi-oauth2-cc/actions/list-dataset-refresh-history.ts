import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Workspace ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
    datasetId: z.string().describe('Dataset ID. Example: "a71c1b98-a0db-4423-a81b-5dcb48d5c8d1"')
});

const RefreshAttemptSchema = z.object({
    attemptId: z.number().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    type: z.string().optional(),
    serviceExceptionJson: z.string().nullable().optional()
});

const RefreshItemSchema = z.object({
    requestId: z.string().optional(),
    id: z.number().optional(),
    refreshType: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    status: z.string().optional(),
    extendedStatus: z.string().nullable().optional(),
    serviceExceptionJson: z.string().nullable().optional(),
    refreshAttempts: z.array(RefreshAttemptSchema).optional()
});

const OutputSchema = z.object({
    items: z.array(RefreshItemSchema)
});

const action = createAction({
    description: 'List the refresh history of a dataset.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Dataset.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-refresh-history
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/datasets/${encodeURIComponent(input.datasetId)}/refreshes`,
            retries: 3
        });

        const providerResponse = z
            .object({
                value: z.array(z.unknown())
            })
            .parse(response.data);

        const items = providerResponse.value.map((item) => {
            const refresh = RefreshItemSchema.parse(item);
            return {
                ...(refresh.requestId !== undefined && { requestId: refresh.requestId }),
                ...(refresh.id !== undefined && { id: refresh.id }),
                ...(refresh.refreshType !== undefined && { refreshType: refresh.refreshType }),
                ...(refresh.startTime !== undefined && { startTime: refresh.startTime }),
                ...(refresh.endTime !== undefined && { endTime: refresh.endTime }),
                ...(refresh.status !== undefined && { status: refresh.status }),
                ...(refresh.extendedStatus != null && { extendedStatus: refresh.extendedStatus }),
                ...(refresh.serviceExceptionJson != null && { serviceExceptionJson: refresh.serviceExceptionJson }),
                ...(refresh.refreshAttempts !== undefined && { refreshAttempts: refresh.refreshAttempts })
            };
        });

        return { items };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
