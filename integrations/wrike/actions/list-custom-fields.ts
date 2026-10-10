import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        title: z.string().optional().describe('Filter custom fields by title using a case-insensitive substring match. Omit to return all fields.'),
        types: z
            .array(z.string())
            .optional()
            .describe('Filter by custom field types, for example ["DropDown", "Currency", "Numeric"]. Omit to return every type.'),
        applicableEntityTypes: z
            .array(z.string())
            .optional()
            .describe(
                'Filter by the entity types a field applies to: "WorkItem" or "User". Defaults to "WorkItem" when omitted, so "User" fields are excluded unless requested.'
            ),
        inheritanceTypes: z
            .array(z.string())
            .optional()
            .describe('Filter by where a field can be inherited: "All", "Tasks", "Projects", or "Folders". Omit to return all inheritance types.')
    })
    .describe('Optional filters for listing the custom field definitions configured on the account.');

const CustomFieldOptionSchema = z.object({
    value: z.string().describe('Option value.'),
    color: z.string().optional().describe('Display color name assigned to the option, for example "Green".')
});

const CustomFieldSettingsSchema = z.object({
    readOnly: z.boolean().describe('Whether the field value is read-only and cannot be set by callers, for example Wrike-computed rollups.'),
    inheritanceType: z.string().optional().describe('Where the field applies: "All", "Projects", or "Folders".'),
    applicableEntityTypes: z.array(z.string()).optional().describe('Entity types the field can be attached to, for example "WorkItem" or "User".'),
    values: z.array(z.string()).optional().describe('Allowed values for DropDown and Multiple-type fields, without colors.'),
    options: z.array(CustomFieldOptionSchema).optional().describe('DropDown and Multiple-type options with their display colors.'),
    optionColorsEnabled: z.boolean().optional().describe('Whether option colors are enabled for DropDown and Multiple-type fields.'),
    allowOtherValues: z.boolean().optional().describe('Whether users may enter values outside the configured options (DropDown only).'),
    useThousandsSeparator: z.boolean().optional().describe('Whether numeric values are formatted with a thousands separator.'),
    decimalPlaces: z.number().optional().describe('Number of decimal places used for Numeric, Percentage, and Currency fields.'),
    currency: z.string().optional().describe('ISO currency code for Currency fields, for example "USD".'),
    timezone: z.string().optional().describe('IANA timezone ID for Date fields, for example "America/New_York".'),
    allowTime: z.boolean().optional().describe('Whether Date fields accept a time component.'),
    aggregation: z.string().optional().describe('How values roll up: "Average", "Sum", or "None".'),
    contacts: z.array(z.string()).optional().describe('Allowed user or invitation IDs for Contacts-type fields.')
});

const CustomFieldSchema = z.object({
    id: z.string().describe('Unique custom field identifier.'),
    accountId: z.string().describe('Identifier of the account that owns the field.'),
    title: z.string().describe('Human-readable field name.'),
    type: z.string().describe('Field type, for example "DropDown", "Currency", or "Numeric".'),
    spaceId: z
        .string()
        .optional()
        .describe('Space this field is scoped to; omitted for account-wide fields. A space-scoped field can only be set on tasks/folders inside that space.'),
    sharedIds: z.array(z.string()).optional().describe('User IDs the field is shared with (obsolete; prefer the provider sharing settings).'),
    description: z.string().optional().describe('Field description; may be an empty string.'),
    archived: z.boolean().optional().describe('Whether the field is archived.'),
    archivedOn: z.string().optional().describe('ISO timestamp when the field was archived.'),
    archivedBy: z.string().optional().describe('User ID that archived the field.'),
    settings: CustomFieldSettingsSchema.optional().describe('Type-specific configuration for the field.')
});

const OutputSchema = z
    .object({
        customFields: z.array(CustomFieldSchema).describe('Custom field definitions configured on the account.')
    })
    .describe('Custom field definitions configured on this Wrike account.');

const ProviderCustomFieldOptionSchema = z.object({
    value: z.string(),
    color: z.string().nullish()
});

const ProviderCustomFieldSettingsSchema = z
    .object({
        readOnly: z.boolean().optional(),
        inheritanceType: z.string().nullish(),
        applicableEntityTypes: z.array(z.string()).nullish(),
        values: z.array(z.string()).nullish(),
        options: z.array(ProviderCustomFieldOptionSchema).nullish(),
        optionColorsEnabled: z.boolean().nullish(),
        allowOtherValues: z.boolean().nullish(),
        useThousandsSeparator: z.boolean().nullish(),
        decimalPlaces: z.number().nullish(),
        currency: z.string().nullish(),
        timezone: z.string().nullish(),
        allowTime: z.boolean().nullish(),
        aggregation: z.string().nullish(),
        contacts: z.array(z.string()).nullish()
    })
    .passthrough();

const ProviderCustomFieldSchema = z.object({
    id: z.string(),
    accountId: z.string(),
    title: z.string(),
    type: z.string(),
    spaceId: z.string().nullish(),
    sharedIds: z.array(z.string()).nullish(),
    description: z.string().nullish(),
    archived: z.boolean().nullish(),
    archivedOn: z.string().nullish(),
    archivedBy: z.string().nullish(),
    settings: ProviderCustomFieldSettingsSchema.nullish()
});

const ProviderResponseSchema = z.object({
    kind: z.string(),
    data: z.array(ProviderCustomFieldSchema)
});

function mapSettings(settings: z.infer<typeof ProviderCustomFieldSettingsSchema>): z.infer<typeof CustomFieldSettingsSchema> {
    return {
        readOnly: settings.readOnly ?? false,
        ...(settings.inheritanceType != null && { inheritanceType: settings.inheritanceType }),
        ...(settings.applicableEntityTypes != null && { applicableEntityTypes: settings.applicableEntityTypes }),
        ...(settings.values != null && { values: settings.values }),
        ...(settings.options != null && {
            options: settings.options.map((option) => ({
                value: option.value,
                ...(option.color != null && { color: option.color })
            }))
        }),
        ...(settings.optionColorsEnabled != null && { optionColorsEnabled: settings.optionColorsEnabled }),
        ...(settings.allowOtherValues != null && { allowOtherValues: settings.allowOtherValues }),
        ...(settings.useThousandsSeparator != null && { useThousandsSeparator: settings.useThousandsSeparator }),
        ...(settings.decimalPlaces != null && { decimalPlaces: settings.decimalPlaces }),
        ...(settings.currency != null && { currency: settings.currency }),
        ...(settings.timezone != null && { timezone: settings.timezone }),
        ...(settings.allowTime != null && { allowTime: settings.allowTime }),
        ...(settings.aggregation != null && { aggregation: settings.aggregation }),
        ...(settings.contacts != null && { contacts: settings.contacts })
    };
}

/**
 * @tags: [read]
 * @tagReason: Only performs a GET against the provider to read custom field definitions; it never mutates provider state.
 * @pitfalls: Omitting applicableEntityTypes defaults to "WorkItem", so "User"-type fields are excluded unless explicitly requested; the title filter is a case-insensitive substring match rather than an exact match, and a space-scoped field returns a spaceId while account-wide fields omit the key entirely instead of returning null.
 */
const action = createAction({
    description: 'List custom field definitions configured on this account (account- or space-specific, not a global Wrike concept).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get<unknown>({
            // https://developers.wrike.com/reference/getcustomfieldsempty
            endpoint: '/customfields',
            params: {
                ...(input.title !== undefined && { title: input.title }),
                ...(input.types !== undefined && { types: JSON.stringify(input.types) }),
                ...(input.applicableEntityTypes !== undefined && { applicableEntityTypes: JSON.stringify(input.applicableEntityTypes) }),
                ...(input.inheritanceTypes !== undefined && { inheritanceTypes: JSON.stringify(input.inheritanceTypes) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            customFields: providerResponse.data.map((field) => ({
                id: field.id,
                accountId: field.accountId,
                title: field.title,
                type: field.type,
                ...(field.spaceId != null && { spaceId: field.spaceId }),
                ...(field.sharedIds != null && { sharedIds: field.sharedIds }),
                ...(field.description != null && { description: field.description }),
                ...(field.archived != null && { archived: field.archived }),
                ...(field.archivedOn != null && { archivedOn: field.archivedOn }),
                ...(field.archivedBy != null && { archivedBy: field.archivedBy }),
                ...(field.settings != null && { settings: mapSettings(field.settings) })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
