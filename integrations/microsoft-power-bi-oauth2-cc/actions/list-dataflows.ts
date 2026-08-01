import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Workspace (group) ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"')
});

const DataflowSchema = z.object({
    objectId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    modelUrl: z.string().optional(),
    configuredBy: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(DataflowSchema)
});

const action = createAction({
    description: 'List dataflows in a workspace',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/rest/api/power-bi/dataflows/get-dataflows
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/dataflows`,
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = z
            .object({
                value: z.array(
                    z
                        .object({
                            objectId: z.string(),
                            name: z.string(),
                            description: z.string().nullish(),
                            modelUrl: z.string().nullish(),
                            configuredBy: z.string().nullish()
                        })
                        .passthrough()
                )
            })
            .parse(response.data);

        return {
            items: providerResponse.value.map((dataflow) => ({
                objectId: dataflow.objectId,
                name: dataflow.name,
                ...(dataflow.description != null && { description: dataflow.description }),
                ...(dataflow.modelUrl != null && { modelUrl: dataflow.modelUrl }),
                ...(dataflow.configuredBy != null && { configuredBy: dataflow.configuredBy })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
