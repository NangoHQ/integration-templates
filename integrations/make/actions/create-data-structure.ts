import { z } from 'zod';
import { createAction } from 'nango';

const SpecItemSchema = z
    .object({
        type: z.string().describe('Field type. Examples: text, number, boolean, date, array, collection'),
        name: z.string().describe('Field name'),
        label: z.string().optional(),
        required: z.boolean().optional()
    })
    .passthrough();

const InputSchema = z.object({
    name: z.string().describe('The name of the data structure. Max 128 characters.'),
    teamId: z.number().describe('The unique ID of the team in which the data structure will be created.'),
    strict: z.boolean().describe('Set to true to enforce strict validation of the data put in the data structure.'),
    spec: z.array(SpecItemSchema).describe('The data structure specification.')
});

const ProviderDataStructureSchema = z
    .object({
        id: z.number(),
        teamId: z.number(),
        name: z.string(),
        strict: z.boolean(),
        spec: z.array(SpecItemSchema)
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number().describe('The unique ID of the created data structure.'),
    teamId: z.number().describe('The unique ID of the team the data structure belongs to.'),
    name: z.string().describe('The name of the data structure.'),
    strict: z.boolean().describe('Whether strict validation is enforced.'),
    spec: z.array(SpecItemSchema).describe('The data structure specification.')
});

const action = createAction({
    description: 'Create a new data structure (schema) that data stores or scenarios can use.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['udts:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.make.com/api-documentation/api-reference/data-structures
        const response = await nango.post({
            endpoint: '/data-structures',
            data: {
                name: input.name,
                teamId: input.teamId,
                strict: input.strict,
                spec: input.spec
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                dataStructure: ProviderDataStructureSchema
            })
            .parse(response.data);

        const dataStructure = providerResponse.dataStructure;

        return {
            id: dataStructure.id,
            teamId: dataStructure.teamId,
            name: dataStructure.name,
            strict: dataStructure.strict,
            spec: dataStructure.spec
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
