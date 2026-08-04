import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('Title of the On-Call page. Example: "Database connection pool exhausted"'),
    urgency: z.enum(['high', 'low']).describe('Urgency level for the page.'),
    target_type: z.enum(['team_id', 'team_handle', 'user_id']).describe('Type of the target being paged.'),
    target_identifier: z.string().describe('UUID or identifier of the target. Example: "785d215c-9831-4702-8108-ff3b2db500c9" or "my-team-handle"'),
    description: z.string().optional().describe('Detailed description of the page.'),
    tags: z.array(z.string()).optional().describe('Tags to attach to the page.')
});

const ProviderPageSchema = z.object({
    data: z
        .object({
            id: z.string(),
            type: z.string(),
            attributes: z
                .object({
                    title: z.string(),
                    urgency: z.string(),
                    description: z.string().optional().nullable(),
                    tags: z.array(z.string()).optional().nullable()
                })
                .passthrough()
                .optional()
                .nullable(),
            relationships: z
                .object({
                    target: z
                        .object({
                            data: z.object({
                                id: z.string(),
                                type: z.string()
                            })
                        })
                        .optional()
                })
                .passthrough()
                .optional()
                .nullable()
        })
        .passthrough()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    urgency: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    target_id: z.string().optional(),
    target_type: z.string().optional()
});

const ConnectionSchema = z.object({
    connection_config: z
        .object({
            siteParameter: z.string()
        })
        .optional()
});

function getOnCallBaseUrl(siteParameter: string): string {
    const mapping: Record<string, string> = {
        'datadoghq.com': 'https://navy.oncall.datadoghq.com/api',
        'us3.datadoghq.com': 'https://teal.oncall.datadoghq.com/api',
        'us5.datadoghq.com': 'https://coral.oncall.datadoghq.com/api',
        'datadoghq.eu': 'https://beige.oncall.datadoghq.eu/api',
        'ap1.datadoghq.com': 'https://saffron.oncall.datadoghq.com/api',
        'ap2.datadoghq.com': 'https://lava.oncall.datadoghq.com/api',
        'ddog-gov.com': 'https://navy.oncall.datadoghq.com/api',
        'us2.ddog-gov.com': 'https://navy.oncall.datadoghq.com/api'
    };

    const baseUrl = mapping[siteParameter];
    if (!baseUrl) {
        throw new Error(`Unsupported Datadog site for On-Call paging: ${siteParameter}`);
    }
    return baseUrl;
}

const action = createAction({
    description: 'Trigger a new On-Call page (alert a specific person or escalation policy immediately, independent of a monitor firing).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = ConnectionSchema.parse(await nango.getConnection());
        const siteParameter = connection.connection_config?.siteParameter ?? 'datadoghq.com';
        const baseUrl = getOnCallBaseUrl(siteParameter);

        const body = {
            data: {
                type: 'pages',
                attributes: {
                    title: input.title,
                    urgency: input.urgency,
                    target: {
                        type: input.target_type,
                        identifier: input.target_identifier
                    },
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.tags !== undefined && { tags: input.tags })
                }
            }
        };

        // https://docs.datadoghq.com/api/latest/on-call-paging/
        const response = await nango.post({
            endpoint: 'v2/on-call/pages',
            baseUrlOverride: baseUrl,
            data: body,
            retries: 3
        });

        const providerPage = ProviderPageSchema.parse(response.data);
        const attributes = providerPage.data.attributes;
        const relationships = providerPage.data.relationships;

        return {
            id: providerPage.data.id,
            type: providerPage.data.type,
            title: attributes?.title ?? input.title,
            urgency: attributes?.urgency ?? input.urgency,
            ...(attributes?.description != null && { description: attributes.description }),
            ...(attributes?.tags != null && { tags: attributes.tags }),
            ...(relationships?.target?.data?.id != null && { target_id: relationships.target.data.id }),
            ...(relationships?.target?.data?.type != null && { target_type: relationships.target.data.type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
