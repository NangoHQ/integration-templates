import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Workspace ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"')
});

const DatasetSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        addRowsAPIEnabled: z.boolean().optional(),
        configuredBy: z.string().optional(),
        isRefreshable: z.boolean().optional(),
        isEffectiveIdentityRequired: z.boolean().optional(),
        isEffectiveIdentityRolesRequired: z.boolean().optional(),
        isOnPremGatewayRequired: z.boolean().optional(),
        description: z.string().optional(),
        contentProviderType: z.string().optional(),
        createdDate: z.string().optional(),
        modifiedDate: z.string().optional(),
        storageMode: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    value: z.array(DatasetSchema)
});

const OutputSchema = z.object({
    datasets: z.array(DatasetSchema)
});

const action = createAction({
    description: 'List datasets in a workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Dataset.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-datasets-in-group
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/datasets`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            datasets: providerResponse.value
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
