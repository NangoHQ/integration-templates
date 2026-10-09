import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .describe(
                'ID of the Zoho Invoice organization that owns the project. Required because this connection cannot discover it automatically. Example: "927270289"'
            ),
        project_id: z.string().describe('Unique identifier of the project to delete. Example: "260815000000165002"')
    })
    .describe('Input for deleting a Zoho Invoice project.');

const ProviderDeleteProjectResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        code: z.number().describe('Zoho response code. 0 indicates the project was deleted.'),
        message: z.string().describe('Provider confirmation message, for example "The project has been deleted."')
    })
    .describe('Result of deleting a Zoho Invoice project.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes an existing project from the Zoho Invoice organization.
 * @pitfalls: An organization_id is required and cannot be auto-discovered with this connection's scopes; deletion is rejected if any expense has been recorded against the project, and fails if the project does not exist.
 */
const action = createAction({
    description: 'Delete a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.projects.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.zoho.com/invoice/api/v3/projects/#delete-project
            endpoint: `/invoice/v3/projects/${encodeURIComponent(input.project_id)}`,
            params: {
                organization_id: input.organization_id
            },
            // DELETE is idempotent, so a retry after a transient failure is safe.
            retries: 3
        });

        const parsed = ProviderDeleteProjectResponseSchema.parse(response.data);

        return {
            code: parsed.code,
            message: parsed.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
