import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const AttributeGroupSchema = z
    .object({
        name: z.string().describe('Machine name of the attribute group, e.g. "activity".'),
        label: z.string().describe('Human-readable label of the attribute group, e.g. "Activity".'),
        priority: z.number().describe('Display priority of the group; lower values are shown first.')
    })
    .describe('Group an attribute belongs to.');

const AttributeServiceSchema = z
    .object({
        name: z.string().describe('Machine name of the connected service, e.g. "googlefit".'),
        label: z.string().describe('Human-readable label of the connected service, e.g. "Google Fit".')
    })
    .describe('A connected service that can provide data for an attribute.');

const ProviderAttributeSchema = z.object({
    name: z.string(),
    label: z.string(),
    template: z.string().nullable().optional(),
    group: AttributeGroupSchema.nullable().optional(),
    service: AttributeServiceSchema.nullable().optional(),
    active: z.boolean(),
    priority: z.number(),
    manual: z.boolean(),
    value_type: z.number(),
    value_type_description: z.string(),
    available_services: z.array(AttributeServiceSchema).optional()
});

type ProviderAttribute = z.infer<typeof ProviderAttributeSchema>;

const CheckpointSchema = z.object({
    page: z.number().int().positive().describe('Next page of /api/2/attributes/ to request while resuming an in-progress full refresh.')
});

const AttributeSchema = z
    .object({
        id: z.string().describe('Stable identifier of the attribute; equal to its name.'),
        name: z.string().describe('Machine name of the attribute, e.g. "steps".'),
        label: z.string().describe('Human-readable label of the attribute, e.g. "Steps".'),
        template: z.string().optional().describe('Name of the attribute template this attribute was created from; absent for a custom attribute.'),
        group: AttributeGroupSchema.optional().describe('Group the attribute belongs to, when the API reports one.'),
        service: AttributeServiceSchema.optional().describe('Connected service currently supplying data; absent when the attribute is inactive or unowned.'),
        active: z.boolean().describe('Whether the attribute is currently active; released attributes remain visible here as inactive.'),
        priority: z.number().describe('Display priority of the attribute; lower values are shown first.'),
        manual: z.boolean().describe('Whether the attribute is tracked manually rather than synced from a connected service.'),
        value_type: z
            .number()
            .describe(
                'Numeric enum of the stored value type: 0 Integer, 1 Float, 2 String, 3 Period (min), 4 Time of day (min from midnight), 5 Percentage, 6 Time of day (min from midday), 7 Boolean, 8 Integer scale (1-9).'
            ),
        value_type_description: z.string().describe('Human-readable description of value_type, e.g. "Integer".'),
        available_services: z.array(AttributeServiceSchema).optional().describe('Connected services that can provide data for this attribute.')
    })
    .describe('An attribute definition tracked by the user, templated or custom, active or inactive.');

const sync = createSync({
    description: "Sync the user's attribute metadata (templated and custom, active and inactive), without values.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Attribute: AttributeSchema
    },

    exec: async (nango) => {
        // Attribute records expose no modified/updated timestamp, so this must stay a full
        // refresh. The checkpoint only resumes page-by-page progress within that full crawl.
        const checkpoint = await nango.getCheckpoint();
        let page: number | undefined = getCheckpointNumber(checkpoint, 'page') ?? 1;

        await nango.trackDeletesStart('Attribute');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.exist.io/reference/attributes/#get-a-users-attributes
            endpoint: '/api/2/attributes/',
            params: {
                include_inactive: 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: LIMIT,
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const attributePage of nango.paginate<ProviderAttribute>(proxyConfig)) {
            const attributes = attributePage.map((record) => {
                const parsed = ProviderAttributeSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse attribute record: ${parsed.error.message}`);
                }

                const attribute = parsed.data;

                return {
                    id: attribute.name,
                    name: attribute.name,
                    label: attribute.label,
                    ...(attribute.template != null && { template: attribute.template }),
                    ...(attribute.group != null && { group: attribute.group }),
                    ...(attribute.service != null && { service: attribute.service }),
                    active: attribute.active,
                    priority: attribute.priority,
                    manual: attribute.manual,
                    value_type: attribute.value_type,
                    value_type_description: attribute.value_type_description,
                    ...(attribute.available_services != null && { available_services: attribute.available_services })
                };
            });

            if (attributes.length > 0) {
                await nango.batchSave(attributes, 'Attribute');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Attribute');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];

function getCheckpointNumber(checkpoint: unknown, key: string): number | undefined {
    if (typeof checkpoint !== 'object' || checkpoint === null) {
        return undefined;
    }

    const value = Reflect.get(checkpoint, key);
    return typeof value === 'number' ? value : undefined;
}

export default sync;
