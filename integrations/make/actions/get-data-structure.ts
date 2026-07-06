import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataStructureId: z.number().describe('Data structure ID. Example: 477315')
});

const SpecFieldSchema = z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean()
});

const DataStructureSchema = z.object({
    id: z.number(),
    name: z.string(),
    teamId: z.number(),
    spec: z.array(SpecFieldSchema)
});

const OutputSchema = z.object({
    dataStructure: DataStructureSchema
});

const action = createAction({
    description: 'Retrieve details of a single data structure.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['udts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.make.com/api-documentation/
            endpoint: `/data-structures/${encodeURIComponent(String(input.dataStructureId))}`,
            retries: 3
        });

        const providerData = z
            .object({
                dataStructure: z
                    .object({
                        id: z.number(),
                        name: z.string(),
                        teamId: z.number(),
                        spec: z.array(
                            z.object({
                                name: z.string(),
                                type: z.string(),
                                required: z.boolean()
                            })
                        )
                    })
                    .passthrough()
            })
            .passthrough()
            .parse(response.data);

        return {
            dataStructure: {
                id: providerData.dataStructure.id,
                name: providerData.dataStructure.name,
                teamId: providerData.dataStructure.teamId,
                spec: providerData.dataStructure.spec.map((field) => ({
                    name: field.name,
                    type: field.type,
                    required: field.required
                }))
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
