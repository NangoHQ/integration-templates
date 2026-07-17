import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderWorkflowSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string()
});

const ProviderResponseSchema = z.object({
    workflows: z.array(ProviderWorkflowSchema)
});

const OutputSchema = z.object({
    workflows: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            status: z.string()
        })
    )
});

const action = createAction({
    description: 'List workflow definitions (id, name, status) for a location.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['workflows.readonly'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const locationId =
            metadata != null && typeof metadata === 'object' && 'locationId' in metadata && typeof metadata['locationId'] === 'string'
                ? metadata['locationId']
                : undefined;

        if (!locationId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'locationId is required in connection metadata.'
            });
        }

        const response = await nango.get({
            // https://highlevel.stoplight.io/docs/integrations/get-workflow
            endpoint: '/workflows/',
            params: {
                locationId: locationId
            },
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.safeParse(response.data);

        if (!providerData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider response did not match expected schema.',
                details: providerData.error.issues
            });
        }

        return {
            workflows: providerData.data.workflows.map((workflow) => ({
                id: workflow.id,
                name: workflow.name,
                status: workflow.status
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
