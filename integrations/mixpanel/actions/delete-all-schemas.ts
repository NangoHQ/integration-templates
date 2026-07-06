import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('Your project id (eg: 12345)')
});

const OutputSchema = z.object({
    deleted_count: z.number().optional(),
    status: z.string().optional()
});

const ProviderResponseSchema = z.object({
    results: z
        .object({
            delete_count: z.number().optional()
        })
        .optional(),
    status: z.string().optional()
});

const action = createAction({
    description: 'Delete all Lexicon schemas in a project',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.mixpanel.com/reference/delete-all-schemas-in-project
            endpoint: `/api/app/projects/${encodeURIComponent(String(input.project_id))}/schemas`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.results?.delete_count !== undefined && { deleted_count: providerResponse.results.delete_count }),
            ...(providerResponse.status !== undefined && { status: providerResponse.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
