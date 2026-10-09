import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        project_id: z.string().describe('Unique identifier of the project to mark inactive. Example: "460000000044019".'),
        organization_id: z.string().describe('Zoho Invoice organization ID that owns the project. Example: "10234695".')
    })
    .describe('Input for marking a Zoho Invoice project inactive.');

const DeactivateProjectResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        project_id: z.string().describe('ID of the project that was marked inactive.'),
        message: z.string().describe('Confirmation message returned by Zoho Invoice for the deactivation.')
    })
    .describe('Result of marking a Zoho Invoice project inactive.');

/**
 * @tags: [write]
 * @tagReason: Marks an existing project inactive through a provider state change; it deletes no data and is reversible via the corresponding activate endpoint.
 * @pitfalls: Deactivating a project that is already inactive still succeeds instead of erroring, and the required organization_id cannot be discovered through the API without a separate settings scope.
 */
const action = createAction({
    description: 'Mark a project as inactive.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.projects.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Deactivation is idempotent (repeating it returns the same success), so retries are safe.
        // https://www.zoho.com/invoice/api/v3/projects/#deactivate-a-project
        const response = await nango.post({
            endpoint: `/invoice/v3/projects/${encodeURIComponent(input.project_id)}/inactive`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        const result = DeactivateProjectResponseSchema.parse(response.data);

        if (result.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: result.message,
                code: result.code
            });
        }

        return {
            project_id: input.project_id,
            message: result.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
