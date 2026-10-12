import { z } from 'zod';
import { createAction } from 'nango';

const PickListValueSchema = z.looseObject({
    id: z.string().optional().describe('Unique ID of the picklist option.'),
    display_value: z.string().optional().describe('Label shown to users for this option. Example: "Consent form".'),
    actual_value: z.string().optional().describe('Value stored on the record when this option is selected.'),
    reference_value: z.string().optional().describe('Reference value used when the option maps to another module.'),
    sequence_number: z.number().optional().describe('Display order of the option within the picklist.'),
    type: z.string().optional().describe('Whether the option is in use. Example: "used".'),
    colour_code: z.string().nullable().optional().describe('Hex colour code for the option, or null when none is set.')
});

const ProfileSchema = z.looseObject({
    id: z.string().optional().describe('Unique ID of the profile.'),
    name: z.string().optional().describe('Profile name. Example: "Administrator".'),
    permission_type: z.string().optional().describe('Access level granted by the profile. Example: "read_write".')
});

const LookupModuleSchema = z.looseObject({
    api_name: z.string().optional().describe('API name of the module the lookup points to. Example: "Accounts".'),
    id: z.string().optional().describe('Unique ID of the linked module.'),
    crypt: z.boolean().optional().describe('Whether the linked module is encrypted.')
});

const LookupSchema = z.looseObject({
    api_name: z.string().optional().describe('API name of the lookup target.'),
    display_label: z.string().optional().describe('Display label of the lookup target.'),
    id: z.string().optional().describe('Unique ID of the lookup field definition.'),
    module: LookupModuleSchema.optional().describe('Details of the module this field looks up to.')
});

const ViewTypeSchema = z.looseObject({
    view: z.boolean().optional().describe('Whether the field is viewable.'),
    edit: z.boolean().optional().describe('Whether the field is editable.'),
    create: z.boolean().optional().describe('Whether the field is creatable.'),
    quick_create: z.boolean().optional().describe('Whether the field is available in quick create.')
});

const FieldSchema = z.looseObject({
    id: z.string().optional().describe('Unique ID of the field.'),
    api_name: z.string().optional().describe('API name to use in requests. Example: "Owner".'),
    field_label: z.string().optional().describe('User-facing label of the field. Example: "Contact Owner".'),
    display_label: z.string().optional().describe('Display label of the field.'),
    data_type: z.string().optional().describe('Bigin data type of the field. Example: "ownerlookup".'),
    json_type: z.string().optional().describe('JSON type of the field value. Example: "jsonobject".'),
    type: z.string().optional().describe('Whether the field is in use. Example: "used".'),
    length: z.number().optional().describe('Maximum length of the field value.'),
    decimal_place: z.number().nullable().optional().describe('Number of decimal places for numeric fields, or null when not applicable.'),
    system_mandatory: z.boolean().optional().describe('Whether Bigin requires the field when creating a record.'),
    field_read_only: z.boolean().optional().describe('Whether the field is read-only at the field level.'),
    read_only: z.boolean().optional().describe('Whether the field is read-only.'),
    custom_field: z.boolean().optional().describe('Whether the field is a custom field.'),
    virtual_field: z.boolean().optional().describe('Whether the field is a virtual field.'),
    display_field: z.boolean().optional().describe('Whether the field is a display field.'),
    visible: z.boolean().optional().describe('Whether the field is visible in the UI.'),
    filterable: z.boolean().optional().describe('Whether records can be filtered by the field.'),
    searchable: z.boolean().optional().describe('Whether records can be searched by the field.'),
    sortable: z.boolean().optional().describe('Whether records can be sorted by the field.'),
    mass_update: z.boolean().optional().describe('Whether the field supports mass update.'),
    webhook: z.boolean().optional().describe('Whether the field is included in webhooks.'),
    businesscard_supported: z.boolean().optional().describe('Whether the field is supported in business cards.'),
    blueprint_supported: z.boolean().optional().describe('Whether the field participates in blueprints.'),
    separator: z.boolean().optional().describe('Whether the field is a layout separator.'),
    display_type: z.number().optional().describe('Bigin display type code.'),
    ui_type: z.number().optional().describe('Bigin UI type code.'),
    quick_sequence_number: z.string().optional().describe('Sequence number of the field in quick create.'),
    created_source: z.string().optional().describe('How the field was created. Example: "default".'),
    tooltip: z.string().nullable().optional().describe('Tooltip text for the field, or null when none.'),
    crypt: z.string().nullable().optional().describe('Encryption setting for the field, or null when not encrypted.'),
    created_time: z.string().nullable().optional().describe('ISO 8601 creation timestamp, or null when unavailable.'),
    modified_time: z.string().nullable().optional().describe('ISO 8601 last-modified timestamp, or null when unavailable.'),
    global_picklist: z.string().nullable().optional().describe('Global picklist associated with the field, or null when none.'),
    external: z.string().nullable().optional().describe('External data reference for the field, or null when none.'),
    subform: z.string().nullable().optional().describe('Parent subform API name when the field belongs to a subform, or null.'),
    association_details: z.string().nullable().optional().describe('Association details for the field, or null when none.'),
    display_format: z.string().nullable().optional().describe('Display format for the field, or null when none.'),
    pick_list_values: z.array(PickListValueSchema).optional().describe('Selectable values when the field is a picklist; empty otherwise.'),
    pick_list_values_sorted_lexically: z.boolean().optional().describe('Whether picklist values are sorted lexically.'),
    unique: z.looseObject({}).optional().describe('Uniqueness constraint details; empty when the field is not unique.'),
    lookup: LookupSchema.optional().describe('Lookup details; empty when the field is not a lookup.'),
    multiselectlookup: z.looseObject({}).optional().describe('Multi-select lookup details; empty when not applicable.'),
    multi_module_lookup: z.looseObject({}).optional().describe('Multi-module lookup details; empty when not applicable.'),
    formula: z.looseObject({}).optional().describe('Formula details; empty when the field is not a formula field.'),
    auto_number: z.looseObject({}).optional().describe('Auto-number details; empty when not applicable.'),
    currency: z.looseObject({}).optional().describe('Currency settings; empty when not applicable.'),
    email_parser: z.looseObject({}).optional().describe('Email parser settings; empty when not applicable.'),
    view_type: ViewTypeSchema.optional().describe('Per-view permissions for the field.'),
    profiles: z.array(ProfileSchema).optional().describe('Profiles that can access the field.')
});

const InputSchema = z
    .object({
        module: z
            .string()
            .regex(/^[A-Za-z][A-Za-z0-9_]*$/)
            .describe(
                'API name of the module whose field metadata to retrieve. Example: "Contacts", "Accounts", "Products". Use the module api_name, not its UI label.'
            )
    })
    .describe('Input for retrieving the field metadata of a Bigin module.');

const OutputSchema = z
    .object({
        fields: z.array(FieldSchema).describe('Field metadata for the requested module, one entry per field.')
    })
    .describe('Field metadata for a single Bigin module.');

/**
 * @tags: [read]
 * @tagReason: Reads module field metadata from the provider's settings API and performs no provider mutations.
 * @pitfalls: Field labels are not API names (e.g. "Contact Owner" is only the label; its api_name is "Owner") and module API names can differ from UI labels (the Companies module is "Accounts"), so always send api_name values. An unknown module fails with a provider INVALID_MODULE error instead of returning an empty result. The read_only and field_read_only flags can disagree for the same field.
 */
const action = createAction({
    description: 'Get the full field metadata (API names, types, picklist values, required/read-only flags) for a given module.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.bigin.com/developer/docs/apis/v2/field-meta.html
        const response = await nango.get({
            endpoint: '/bigin/v2/settings/fields',
            params: {
                module: input.module
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);

        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
