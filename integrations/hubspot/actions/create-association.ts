import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from_object_type: z.string().describe('The type of the object to associate from. Example: "contacts", "companies", "deals", "tickets"'),
    from_object_id: z.string().describe('The ID of the object to associate from. Example: "12345"'),
    to_object_type: z.string().describe('The type of the object to associate to. Example: "contacts", "companies", "deals", "tickets"'),
    to_object_id: z.string().describe('The ID of the object to associate to. Example: "67890"'),
    association_type: z.string().optional().describe('The association type identifier. If not provided, a default association will be created.'),
    association_category: z
        .enum(['HUBSPOT_DEFINED', 'USER_DEFINED', 'INTEGRATOR_DEFINED'])
        .optional()
        .describe('The category of the association type. Required if association_type is provided.')
});

const OutputSchema = z.object({
    status: z.string(),
    results: z.array(
        z.object({
            from_id: z.string(),
            to_id: z.string(),
            association_type: z.union([z.string(), z.null()]),
            association_category: z.union([z.string(), z.null()])
        })
    ),
    started_at: z.string(),
    completed_at: z.string()
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
                    id: input.from_object_id
                },
                to: {
                    id: input.to_object_id
                }
            }
        ];

        const inputEntry = inputs[0]!;

        // Add association type if provided
        if (input.association_type) {
            inputEntry['type'] = input.association_type;

            if (input.association_category) {
                inputEntry['associationCategory'] = input.association_category;
            }
        }

        // https://developers.hubspot.com/docs/api-reference/crm-associations-v3/batch/create
        const response = await nango.post({
            endpoint: `/crm/v3/associations/${input.from_object_type}/${input.to_object_type}/batch/create`,
            data: { inputs },
            retries: 10
        });

        const data = response.data;

        return {
            status: data.status,
            results: (data.results || []).map((result: any) => ({
                from_id: result.from?.id ?? input.from_object_id,
                to_id: result.to?.id ?? input.to_object_id,
                association_type: result.type ?? null,
                association_category: result.associationCategory ?? null
            })),
            started_at: data.startedAt,
            completed_at: data.completedAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
