import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        account_id: z.number().int().positive().describe('Timely account ID. Discover it with the list-accounts action. Example: 1145787'),
        name: z
            .string()
            .refine((value) => value.trim().length > 0, { message: 'name must not be blank.' })
            .describe('Name of the project to create. Must not be blank. Example: "Website Redesign"'),
        company_id: z.number().int().positive().describe('ID of the client (company) the project belongs to, from list-clients. Example: 2193170'),
        rate_type: z
            .string()
            .optional()
            .describe('Billing rate type. Only "non-billable" has been confirmed accepted; defaults to "non-billable" when omitted'),
        description: z.string().optional().describe('Optional project description'),
        color: z.string().optional().describe('Optional project color as a hex string without "#". Example: "ff0000"'),
        external_id: z.string().optional().describe('Optional external identifier to correlate the project with another system')
    })
    .describe('Input for creating a Timely project');

const ClientSchema = z.object({
    id: z.number().describe('Client ID'),
    name: z.string().describe('Client name'),
    color: z.string().nullable().describe('Client color as a hex string, or null when unset'),
    active: z.boolean().describe('Whether the client is active')
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    color: z.string().nullable(),
    rate_type: z.string(),
    billable: z.boolean(),
    active: z.boolean(),
    account_id: z.number(),
    external_id: z.string().nullable(),
    enable_labels: z.string(),
    created_at: z.number(),
    updated_at: z.number(),
    client: ClientSchema.nullable()
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the created project'),
        name: z.string().describe('Name of the created project'),
        description: z.string().nullable().describe('Project description, or null when unset'),
        color: z.string().nullable().describe('Project color as a hex string, or null when unset'),
        rate_type: z.string().describe('Billing rate type of the project'),
        billable: z.boolean().describe('Whether the project is billable'),
        active: z.boolean().describe('Whether the project is active'),
        account_id: z.number().describe('Timely account ID the project belongs to'),
        external_id: z.string().nullable().describe('External identifier, or null when unset'),
        enable_labels: z.string().describe('Label mode for the project. Example: "none"'),
        client: ClientSchema.nullable().describe('Client (company) the project belongs to'),
        created_at: z.number().describe('Creation time as a Unix timestamp in seconds'),
        updated_at: z.number().describe('Last update time as a Unix timestamp in seconds')
    })
    .describe('A Timely project');

/**
 * @tags: [write]
 * @tagReason: Creates a new project via the provider's POST endpoint.
 * @pitfalls: Project names must be unique, so creating one whose name already exists fails with 422. company_id must reference an existing client (there is no separate companies resource) or the call fails with 422. Only rate_type "non-billable" is confirmed accepted and it is used when rate_type is omitted; other values may be rejected.
 */
const action = createAction({
    description: 'Create a new project under a client (company).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.timely.com/
            endpoint: `/1.1/${encodeURIComponent(String(input.account_id))}/projects`,
            data: {
                project: {
                    name: input.name,
                    rate_type: input.rate_type ?? 'non-billable',
                    company_id: input.company_id,
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.color !== undefined && { color: input.color }),
                    ...(input.external_id !== undefined && { external_id: input.external_id })
                }
            },
            // Project creation is not idempotent: retrying after a lost response could create a duplicate project.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const project = ProviderProjectSchema.parse(response.data);

        return {
            id: project.id,
            name: project.name,
            description: project.description,
            color: project.color,
            rate_type: project.rate_type,
            billable: project.billable,
            active: project.active,
            account_id: project.account_id,
            external_id: project.external_id,
            enable_labels: project.enable_labels,
            client: project.client,
            created_at: project.created_at,
            updated_at: project.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
