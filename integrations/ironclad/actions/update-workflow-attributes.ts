import { z } from 'zod';
import { createAction } from 'nango';

const UpdateItemSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('set').describe('Update action. Example: "set"'),
        path: z.string().describe('Attribute ID. Example: "shortResponseText"'),
        value: z.unknown().describe('Value to set. Must match the attribute type format.')
    }),
    z.object({
        action: z.literal('remove').describe('Update action. Example: "remove"'),
        path: z.string().describe('Attribute ID. Example: "shortResponseText"')
    })
]);

const InputSchema = z.object({
    workflowId: z.string().describe('Workflow ID. Example: "6a6b329292e6f649aa6add06"'),
    updates: z.array(UpdateItemSchema)
});

const ProviderWorkflowSchema = z.object({
    id: z.string(),
    title: z.string(),
    step: z.string(),
    status: z.string(),
    ironcladId: z.string(),
    attributes: z.record(z.string(), z.unknown())
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    step: z.string(),
    status: z.string(),
    ironcladId: z.string(),
    attributes: z.record(z.string(), z.unknown())
});

const action = createAction({
    description: 'Set or clear attribute values on a workflow that is still at its Review step',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.updateWorkflows'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developer.ironcladapp.com/
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/attributes`,
            data: {
                updates: input.updates.map((update) =>
                    update.action === 'set'
                        ? { action: update.action, path: update.path, value: update.value }
                        : { action: update.action, path: update.path }
                )
            },
            retries: 1
        });

        const providerWorkflow = ProviderWorkflowSchema.parse(response.data);

        return {
            id: providerWorkflow.id,
            title: providerWorkflow.title,
            step: providerWorkflow.step,
            status: providerWorkflow.status,
            ironcladId: providerWorkflow.ironcladId,
            attributes: providerWorkflow.attributes
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
