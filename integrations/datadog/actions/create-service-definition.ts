import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        'schema-version': z.string().optional().describe('Schema version. Example: "v2.2"'),
        'dd-service': z.string().describe('Service name. Example: "my-service"'),
        team: z.string().optional().describe('Team that owns the service. Example: "my-team"'),
        description: z.string().optional().describe('A short description of the service.'),
        contacts: z.array(z.record(z.string(), z.unknown())).optional().describe('A list of contacts related to the service.'),
        integrations: z.record(z.string(), z.unknown()).optional().describe('Third party integrations that Datadog supports.'),
        tags: z.array(z.string()).optional().describe('A set of custom tags.'),
        links: z.array(z.record(z.string(), z.unknown())).optional().describe('A list of links related to the service.'),
        extensions: z.record(z.string(), z.unknown()).optional().describe('Extensions to the schema.'),
        languages: z.array(z.string()).optional().describe("The service's programming languages."),
        lifecycle: z.string().optional().describe('The current life cycle phase of the service.'),
        tier: z.string().optional().describe('Importance of the service.'),
        type: z.string().optional().describe('The type of service.'),
        repos: z.array(z.record(z.string(), z.unknown())).optional().describe('A list of code repositories related to the service.'),
        docs: z.array(z.record(z.string(), z.unknown())).optional().describe('A list of documentation related to the service.')
    })
    .passthrough();

const ProviderMetaSchema = z.object({
    'github-html-url': z.string().optional(),
    'ingested-schema-version': z.string().optional(),
    'ingestion-source': z.string().optional(),
    'last-modified-time': z.string().optional(),
    origin: z.string().optional(),
    'origin-detail': z.string().optional(),
    warnings: z
        .array(
            z.object({
                'instance-location': z.string().optional(),
                'keyword-location': z.string().optional(),
                message: z.string().optional()
            })
        )
        .optional()
});

const ProviderResponseDataItemSchema = z.object({
    attributes: z
        .object({
            meta: ProviderMetaSchema.optional(),
            schema: z.record(z.string(), z.unknown()).optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderResponseDataItemSchema).optional()
});

const OutputSchema = z.object({
    data: z.array(z.record(z.string(), z.unknown())).optional()
});

const action = createAction({
    description: 'Create or update a service definition (also used for updates — same endpoint upserts by service name).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['apm_service_catalog_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            ...input,
            'schema-version': input['schema-version'] ?? 'v2.2'
        };

        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/service-definition/#create-or-update-service-definition
            endpoint: 'v2/services/definitions',
            data: body,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            data: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
