import { z } from 'zod';
import { createAction } from 'nango';

const QuestionSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    type: z.string(),
    required: z.boolean(),
    answer_choices: z.array(z.string()).nullable()
});

const RoutingFormResourceSchema = z.object({
    uri: z.string(),
    organization: z.string(),
    name: z.string(),
    status: z.enum(['published', 'unpublished']),
    questions: z.array(QuestionSchema),
    created_at: z.string(),
    updated_at: z.string()
});

const InputSchema = z.object({
    uuid: z.string().describe('The unique identifier of the routing form in UUID format. Example: "9f53ccd3-88e6-4c62-ad9e-91ea57d2187d"')
});

const OutputSchema = z
    .object({
        uri: z.string(),
        organization: z.string(),
        name: z.string(),
        status: z.enum(['published', 'unpublished']),
        questions: z.array(QuestionSchema),
        created_at: z.string(),
        updated_at: z.string()
    })
    .nullable();

const action = createAction({
    description: 'Retrieve a single routing form from Calendly.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-routing-form',
        group: 'Routing Forms'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['routing_forms:read'],

    // @allowTryCatch - Need to catch 404 errors from the API and return null
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        try {
            // https://developer.calendly.com/api-docs/c16b759d5d265-get-routing-form
            const response = await nango.get({
                endpoint: `/routing_forms/${input.uuid}`,
                retries: 3
            });

            if (!response.data || !response.data.resource) {
                return null;
            }

            const resource = RoutingFormResourceSchema.parse(response.data.resource);

            return {
                uri: resource.uri,
                organization: resource.organization,
                name: resource.name,
                status: resource.status,
                questions: resource.questions,
                created_at: resource.created_at,
                updated_at: resource.updated_at
            };
        } catch (error) {
            if (typeof error === 'object' && error !== null && 'status' in error && error.status === 404) {
                return null;
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
