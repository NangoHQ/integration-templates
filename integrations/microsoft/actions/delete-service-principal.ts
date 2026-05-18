import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    service_principal_id: z.string().describe('The unique identifier of the service principal to delete. Example: "8c7410b7-37cd-4463-981d-74cd6ab033a7"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    service_principal_id: z.string()
});

const action = createAction({
    description: 'Delete a service principal in Microsoft Entra ID',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-service-principal',
        group: 'Service Principals'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Application.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/serviceprincipal-delete
        await nango.delete({
            endpoint: `/v1.0/servicePrincipals/${encodeURIComponent(input.service_principal_id)}`,
            retries: 3
        });

        return {
            success: true,
            service_principal_id: input.service_principal_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
