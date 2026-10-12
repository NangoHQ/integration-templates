import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        project_id: z.string().describe('Unique ID of the project to activate. Example: "460000000044019"'),
        organization_id: z.string().describe('ID of the Zoho Invoice organization that owns the project. Example: "10234695"')
    })
    .describe('Input for marking a Zoho Invoice project as active.');

const ActivateProjectResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const ProviderProjectSchema = z.object({
    project_id: z.string(),
    project_name: z.string().optional(),
    status: z.string().optional()
});

const ProviderProjectResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    project: ProviderProjectSchema
});

const OutputSchema = z
    .object({
        project_id: z.string().describe('Unique ID of the project that was activated.'),
        status: z.string().describe('Project status confirmed by the provider after activation. Example: "active"'),
        message: z.string().describe('Confirmation message returned by the provider.')
    })
    .describe('Result of activating a Zoho Invoice project.');

/**
 * @tags: [write]
 * @tagReason: Marks the project as active by mutating provider state.
 * @pitfalls: organization_id is required and cannot be looked up through this connection's granted scopes, so callers must supply the numeric organization ID; activating a project that is already active returns success rather than an error.
 */
const action = createAction({
    description: 'Mark a project as active.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.projects.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const projectId = encodeURIComponent(input.project_id);

        // https://www.zoho.com/invoice/api/v3/projects/#activate-a-project
        const activateResponse = await nango.post({
            endpoint: `/invoice/v3/projects/${projectId}/active`,
            params: {
                organization_id: input.organization_id
            },
            // Idempotent state setter: retrying an already-applied activation leaves the project active.
            retries: 3
        });

        const activation = ActivateProjectResponseSchema.parse(activateResponse.data);

        // https://www.zoho.com/invoice/api/v3/projects/#get-a-project
        const projectResponse = await nango.get({
            endpoint: `/invoice/v3/projects/${projectId}`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        const project = ProviderProjectResponseSchema.parse(projectResponse.data);

        return {
            project_id: project.project.project_id,
            status: project.project.status ?? 'active',
            message: activation.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
