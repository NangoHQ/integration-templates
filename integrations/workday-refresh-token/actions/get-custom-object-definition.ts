import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the custom object definition to retrieve.')
    })
    .describe('Input for retrieving a single custom object definition by its unique identifier.');

const ProviderBusinessObjectSchema = z.object({
    id: z.string(),
    descriptor: z.string().optional().nullable()
});

const ProviderCustomObjectDefinitionSchema = z.object({
    id: z.string(),
    descriptor: z.string().optional().nullable(),
    active: z.boolean().optional().nullable(),
    multiInstance: z.boolean().optional().nullable(),
    customObjectName: z.string().optional().nullable(),
    customObjectAlias: z.string().optional().nullable(),
    businessObject: ProviderBusinessObjectSchema.optional().nullable()
});

const MetadataSchema = z.object({
    tenant: z.string()
});

const BusinessObjectSchema = z.object({
    id: z.string().describe('Unique identifier of the business object this custom object extends.'),
    descriptor: z.string().describe('Display name of the business object type.').optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier for the custom object definition.'),
        descriptor: z.string().describe('Display name of the custom object type.').optional(),
        active: z.boolean().describe('Whether the custom object definition is active.').optional(),
        multiInstance: z.boolean().describe('Whether multiple instances of this custom object are allowed per parent object.').optional(),
        customObjectName: z.string().describe('The API name of the custom object type.').optional(),
        customObjectAlias: z.string().describe('The web service alias used to reference this custom object in API requests.').optional(),
        businessObject: BusinessObjectSchema.describe('The standard Workday business object this custom object extends.').optional()
    })
    .describe('Output containing the details of a single custom object definition.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single custom object definition from Workday by its unique identifier.
 * @pitfalls: Workday tenants may expose different service versions and field sets for custom object definitions, so documented fields such as `fields`, `createdOn`, or `lastModified` can be absent from the response even when the definition exists.
 */
const action = createAction({
    description: 'Get a single custom object definition by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Connection metadata must include a tenant string.'
            });
        }

        const tenant = parsedMetadata.data.tenant;

        const response = await nango.get({
            // https://developer.workday.com/documentation/izr1621310982493/CustomObjectMultiInstanceRESTAPIs
            endpoint: `v1/${encodeURIComponent(tenant)}/customObjectDefinitions/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Custom object definition not found.',
                id: input.id
            });
        }

        const providerData = ProviderCustomObjectDefinitionSchema.parse(response.data);

        return {
            id: providerData.id,
            ...(providerData.descriptor != null && { descriptor: providerData.descriptor }),
            ...(providerData.active != null && { active: providerData.active }),
            ...(providerData.multiInstance != null && { multiInstance: providerData.multiInstance }),
            ...(providerData.customObjectName != null && { customObjectName: providerData.customObjectName }),
            ...(providerData.customObjectAlias != null && { customObjectAlias: providerData.customObjectAlias }),
            ...(providerData.businessObject != null && {
                businessObject: {
                    id: providerData.businessObject.id,
                    ...(providerData.businessObject.descriptor != null && { descriptor: providerData.businessObject.descriptor })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
