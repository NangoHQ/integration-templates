import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        logicalName: z
            .string()
            .min(1)
            .describe(
                'Logical (lowercase) name of the entity whose fields are listed, e.g. "account". Use the list-entity-definitions action to discover valid logical names, including custom entities.'
            ),
        select: z
            .array(z.string().min(1))
            .optional()
            .describe(
                'OData $select list of attribute metadata fields to return, e.g. ["LogicalName", "AttributeType", "Targets"]. Defaults to a common core set of metadata fields. "LogicalName" is always included. Extra requested fields are passed through in the output with their provider casing.'
            )
    })
    .describe('Input for listing all attributes (fields) defined on a Dataverse entity, including custom fields.');

const AttributeSchema = z
    .object({
        logicalName: z
            .string()
            .describe('Logical (lowercase) name of the attribute, e.g. "name". Use this name in $select/$filter of data queries against the entity.'),
        schemaName: z.string().optional().describe('Schema name of the attribute with its original casing, e.g. "AccountNumber".'),
        attributeType: z.string().optional().describe('Dataverse attribute type, e.g. "String", "Lookup", "Picklist", "DateTime", "Money".'),
        odataType: z
            .string()
            .optional()
            .describe('OData type discriminator identifying the concrete attribute metadata subtype, e.g. "#Microsoft.Dynamics.CRM.StringAttributeMetadata".'),
        displayName: z.string().optional().describe('Localized display name of the attribute.'),
        description: z.string().optional().describe('Localized description of the attribute.'),
        isCustomAttribute: z.boolean().optional().describe('True when the attribute is a custom field added to the org rather than a platform-provided field.'),
        isPrimaryId: z.boolean().optional().describe('True when the attribute is the primary key of the entity.'),
        isPrimaryName: z.boolean().optional().describe('True when the attribute is the primary name (display) field of the entity.'),
        requiredLevel: z
            .string()
            .optional()
            .describe('Requirement level of the attribute, e.g. "None", "SystemRequired", "ApplicationRequired", "Recommended".')
    })
    .passthrough()
    .describe('Metadata of a single attribute. Additional fields requested via select are passed through unchanged with their provider casing.');

const OutputSchema = z
    .object({
        attributes: z
            .array(AttributeSchema)
            .describe('All attributes (fields) defined on the entity, including custom fields. Always returned as a single unpaginated collection.')
    })
    .describe('Attribute metadata defined on the requested entity, including custom fields.');

const RawLocalizedLabelSchema = z
    .object({
        Label: z.string().nullable().optional(),
        LanguageCode: z.number().optional()
    })
    .passthrough();

const RawLabelSchema = z
    .object({
        UserLocalizedLabel: RawLocalizedLabelSchema.nullable().optional(),
        LocalizedLabels: z.array(RawLocalizedLabelSchema).optional()
    })
    .passthrough()
    .nullable()
    .optional();

const RawAttributeSchema = z
    .object({
        '@odata.type': z.string().optional(),
        LogicalName: z.string().nullable().optional(),
        SchemaName: z.string().nullable().optional(),
        AttributeType: z.string().nullable().optional(),
        DisplayName: RawLabelSchema,
        Description: RawLabelSchema,
        IsCustomAttribute: z.boolean().nullable().optional(),
        IsPrimaryId: z.boolean().nullable().optional(),
        IsPrimaryName: z.boolean().nullable().optional(),
        RequiredLevel: z
            .object({
                Value: z.string().nullable().optional()
            })
            .passthrough()
            .nullable()
            .optional()
    })
    .passthrough();

const RawResponseSchema = z.object({
    value: z.array(RawAttributeSchema)
});

const DEFAULT_SELECT = [
    'LogicalName',
    'SchemaName',
    'AttributeType',
    'DisplayName',
    'Description',
    'IsCustomAttribute',
    'IsPrimaryId',
    'IsPrimaryName',
    'RequiredLevel'
];

function extractLabel(label: z.infer<typeof RawLabelSchema>): string | undefined {
    const userLabel = label?.UserLocalizedLabel?.Label;
    if (userLabel != null && userLabel !== '') {
        return userLabel;
    }
    const localized = label?.LocalizedLabels?.find((entry) => entry.Label != null && entry.Label !== '');
    return localized?.Label ?? undefined;
}

/**
 * @tags: [read]
 * @tagReason: Only reads entity attribute metadata from the provider; it never creates, updates, or deletes anything.
 * @pitfalls: Always returns the entity's full attribute list in one unpaginated response (the provider silently ignores $top on this collection), so large entities produce large payloads — pass a narrow select to keep each item small. Attribute-type detail such as lookup Targets or picklist OptionSet is only included when explicitly requested via select.
 */
const action = createAction({
    description: 'List all fields (attributes) defined on a given Dataverse entity, including custom fields.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requested = input.select !== undefined && input.select.length > 0 ? input.select : DEFAULT_SELECT;
        const selectFields = requested.includes('LogicalName') ? requested : ['LogicalName', ...requested];

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-metadata-web-api
            endpoint: `/api/data/v9.2/EntityDefinitions(LogicalName='${encodeURIComponent(input.logicalName)}')/Attributes`,
            params: {
                $select: selectFields.join(',')
            },
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = RawResponseSchema.parse(response.data);

        const attributes = parsed.value.map((raw) => {
            const {
                '@odata.type': rawOdataType,
                LogicalName: rawLogicalName,
                SchemaName: rawSchemaName,
                AttributeType: rawAttributeType,
                DisplayName: rawDisplayName,
                Description: rawDescription,
                IsCustomAttribute: rawIsCustomAttribute,
                IsPrimaryId: rawIsPrimaryId,
                IsPrimaryName: rawIsPrimaryName,
                RequiredLevel: rawRequiredLevel,
                ...extra
            } = raw;
            const displayName = extractLabel(rawDisplayName);
            const description = extractLabel(rawDescription);
            return {
                ...extra,
                logicalName: rawLogicalName ?? '',
                ...(rawOdataType != null && { odataType: rawOdataType }),
                ...(rawSchemaName != null && { schemaName: rawSchemaName }),
                ...(rawAttributeType != null && { attributeType: rawAttributeType }),
                ...(displayName != null && { displayName }),
                ...(description != null && { description }),
                ...(rawIsCustomAttribute != null && { isCustomAttribute: rawIsCustomAttribute }),
                ...(rawIsPrimaryId != null && { isPrimaryId: rawIsPrimaryId }),
                ...(rawIsPrimaryName != null && { isPrimaryName: rawIsPrimaryName }),
                ...(rawRequiredLevel?.Value != null && { requiredLevel: rawRequiredLevel.Value })
            };
        });

        return { attributes };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
