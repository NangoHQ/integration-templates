import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fromObjectType: z.string().describe('The type of the object to associate from. Example: "contacts", "companies", "deals", "tickets"'),
    fromObjectId: z.string().describe('The ID of the object to associate from. Example: "12345"'),
    toObjectType: z.string().describe('The type of the object to associate to. Example: "contacts", "companies", "deals", "tickets"'),
    toObjectId: z.string().describe('The ID of the object to associate to. Example: "67890"'),
    associationType: z.string().optional().describe('The association type identifier. If not provided, a default association will be created.'),
    associationCategory: z
        .enum(['HUBSPOT_DEFINED', 'USER_DEFINED', 'INTEGRATOR_DEFINED'])
        .optional()
        .describe('The category of the association type. Required if association_type is provided.')
});

const OutputSchema = z.object({
    status: z.string(),
    results: z.array(
        z.object({
            fromId: z.string(),
            toId: z.string(),
            associationType: z.string().optional(),
            associationCategory: z.string().optional()
        })
    ),
    startedAt: z.string(),
    completedAt: z.string()
});

const action = createAction({
    description: 'Associate two records together',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-association',
        group: 'Associations'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.contacts.write', 'crm.objects.companies.write', 'crm.objects.deals.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const inputs: Record<string, any>[] = [
            {
                from: {
                    id: input.fromObjectId
                },
                to: {
                    id: input.toObjectId
                }
            }
        ];

        const inputEntry = inputs[0]!;

        // Add association type if provided
        if (input.associationType) {
            inputEntry['type'] = input.associationType;

            if (input.associationCategory) {
                inputEntry['associationCategory'] = input.associationCategory;
            }
        }

        // https://developers.hubspot.com/docs/api-reference/crm-associations-v3/batch/create
        const response = await nango.post({
            endpoint: `/crm/v3/associations/${input.fromObjectType}/${input.toObjectType}/batch/create`,
            data: { inputs },
            retries: 3
        });

        const data = response.data;

        return {
            status: data.status,
            results: (data.results || []).map((result: any) => ({
                fromId: result.from?.id ?? input.fromObjectId,
                toId: result.to?.id ?? input.toObjectId,
                associationType: result.type ?? undefined,
                associationCategory: result.associationCategory ?? undefined
            })),
            startedAt: data.startedAt,
            completedAt: data.completedAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
