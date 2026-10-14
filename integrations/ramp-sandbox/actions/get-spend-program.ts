import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest currency unit (for USD, cents).'),
    currency_code: z.string().describe('ISO 4217 currency code, for example "USD".'),
    minor_unit_conversion_rate: z
        .number()
        .optional()
        .describe('Divisor that converts amount to the real currency value (100 for USD). Omitted when not applicable.')
});

const PermittedSpendTypesSchema = z.object({
    primary_card_enabled: z.boolean().describe('Whether the cardholder physical card can be linked to this spend program.'),
    reimbursements_enabled: z.boolean().describe('Whether reimbursements can be submitted against this spend program.')
});

const SpendingRestrictionsSchema = z.object({
    allowed_categories: z.array(z.number()).describe('Ramp category codes allowed for the spend program.'),
    blocked_categories: z.array(z.number()).describe('Ramp category codes blocked for the spend program.'),
    allowed_vendors: z.array(z.string()).describe('UUIDs of merchants allowed for the spend program.'),
    blocked_vendors: z.array(z.string()).describe('UUIDs of merchants blocked for the spend program.'),
    interval: z.string().describe('Time interval the limit applies to, for example "MONTHLY", "YEARLY" or "CUSTOM".'),
    limit: CurrencyAmountSchema.optional().describe('Total amount limit per interval. Omitted when no limit is set.'),
    temporary_limit: CurrencyAmountSchema.optional().describe('Temporary amount limit per interval. Omitted when none is set.'),
    transaction_amount_limit: CurrencyAmountSchema.optional().describe('Maximum amount allowed on a single transaction. Omitted when none is set.'),
    auto_lock_date: z.string().optional().describe('ISO 8601 date-time when the spend program auto-locks. Omitted when it never locks.'),
    start_of_interval: z.string().optional().describe('ISO 8601 date-time when the current limit interval started. Omitted when no interval applies.'),
    next_interval_reset: z.string().optional().describe('ISO 8601 date-time when the limit interval resets next. Omitted when no interval applies.')
});

const LineItemAccountingFieldSchema = z.object({
    id: z.string().describe('UUID of the accounting field within Ramp.'),
    external_id: z.string().describe('External ID that uniquely identifies this field in the ERP.'),
    name: z.string().describe('Display name of the accounting field.'),
    type: z.string().describe('Accounting field type, for example "GL_ACCOUNT" or "COST_CENTER".'),
    is_required: z.boolean().describe('Whether this accounting field is required for line items.')
});

const LineItemCustomFieldSchema = z.object({
    id: z.string().describe('ID that uniquely identifies the custom field within Ramp.'),
    display_name: z.string().describe('Display name of the custom field.'),
    description: z.string().optional().describe('Description of the custom field. Omitted when none is set.'),
    field_type: z.string().describe('Custom field type, for example "text", "select" or "currency".'),
    is_required: z.boolean().describe('Whether this custom field is required for line items.')
});

const CustomFormChoiceSchema = z.object({
    value: z
        .object({
            value: z.string().describe('Choice label presented to the requester.')
        })
        .describe('Choice value wrapper.'),
    value_id: z.string().describe('Stable identifier for this choice.')
});

const MappedFieldSchema = z
    .object({
        mapped_field: z.string().describe('Target field this question populates, for example "PURCHASE_ORDER__PAYEE_CONTACT".')
    })
    .passthrough();

const FieldMappingReferenceSchema = z
    .object({
        node_id: z.string().optional().describe('Workflow node that consumes this question. Omitted when no node currently uses it.'),
        remote_system: z.string().describe('Integration provider that consumes the mapped question.'),
        approval_trigger_metadata_uuid: z.string().describe('UUID of the approval-step metadata that owns the field mapping.')
    })
    .passthrough();

const CustomFormFieldDefinitionSchema = z
    .object({
        field_type: z.string().describe('Field input type, for example "TEXT", "TEXT_SINGLE_SELECT", "DATE", "BOOLEAN" or "FILE_UPLOAD".'),
        choices: z.array(CustomFormChoiceSchema).optional().describe('Selectable choices for select-style fields.'),
        mapped_fields: z.array(MappedFieldSchema).optional().describe('External fields this question populates.'),
        document_category: z.string().optional().describe('Document category for file-upload fields. Omitted when unset.'),
        allowed_file_types: z.array(z.string()).optional().describe('Allowed file extensions for file-upload fields. Omitted when unrestricted.')
    })
    .passthrough();

const CustomFormFieldSchema = z.object({
    field_id: z.string().describe('Unique identifier of the question.'),
    label: z.string().describe('Question text shown to the requester.'),
    short_title: z.string().optional().describe('Optional concise title. Omitted when none is set.'),
    description: z.string().optional().describe('Help text for the question. Omitted when none is set.'),
    required: z.boolean().describe('Whether the question is always required.'),
    exclude_from_ai_prefill: z.boolean().describe('Whether AI intake and document prefill must never answer this question.'),
    conditions: z.unknown().optional().describe('Conditional-visibility workflow that controls when this question is shown. Omitted when always shown.'),
    required_if_conditions: z.unknown().optional().describe('Conditions that make this question required when they evaluate to true. Omitted when none apply.'),
    answer_filter_workflow_definition: z.unknown().optional().describe('Workflow that conditionally filters this question choices. Omitted when unfiltered.'),
    default_answer_workflow_definition: z
        .unknown()
        .optional()
        .describe('Workflow that conditionally defaults this question answer. Omitted when no default is set.'),
    is_mapped_to_ironclad_field: z.boolean().describe('Whether the question maps to an Ironclad field.'),
    is_used_in_approval_workflow_condition: z.boolean().describe('Whether the question is used in approval conditions or approval steps.'),
    is_used_in_approval_workflow_approval_step: z.boolean().describe('Whether an approval step selects its approver from this question.'),
    is_used_in_custom_form_workflow_condition: z.boolean().describe('Whether the question is used in a custom form workflow condition.'),
    field_mapping_references: z.array(FieldMappingReferenceSchema).describe('Integration field mappings that reference this question.'),
    attachments: z.array(z.unknown()).describe('Attachments configured on this question.'),
    global_library_field_id: z.string().optional().describe('Global Question Library field ID. Omitted when not sourced from the library.'),
    disclaimer: z.string().optional().describe('Disclaimer text shown with the question. Omitted when none is set.'),
    document_category: z.string().optional().describe('Document category for the question. Omitted when unset.'),
    field: CustomFormFieldDefinitionSchema.describe('Type-specific definition of the question.')
});

const CustomFormSchema = z.object({
    label: z.string().optional().describe('Label of the custom form. Omitted when none is set.'),
    fields: z.array(CustomFormFieldSchema).describe('Questions that make up the custom form.')
});

const CustomFormCollectionLogEntrySchema = z.object({
    label: z.string().optional().describe('Label of the form collection. Omitted when none is set.'),
    forms: z.array(CustomFormSchema).describe('Custom forms in the collection.')
});

const CustomFormCollectionSchema = z.object({
    custom_form_collection_log_entry: CustomFormCollectionLogEntrySchema.optional().describe('Latest revision of the form collection. Omitted when none exists.')
});

const ProviderCurrencyAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullable()
});

const ProviderSpendingRestrictionsSchema = z.object({
    interval: z.string(),
    limit: ProviderCurrencyAmountSchema.nullable(),
    temporary_limit: ProviderCurrencyAmountSchema.nullable(),
    transaction_amount_limit: ProviderCurrencyAmountSchema.nullable(),
    auto_lock_date: z.string().nullable(),
    start_of_interval: z.string().nullable(),
    next_interval_reset: z.string().nullable(),
    allowed_categories: z.array(z.number()),
    blocked_categories: z.array(z.number()),
    allowed_vendors: z.array(z.string()),
    blocked_vendors: z.array(z.string())
});

const ProviderPermittedSpendTypesSchema = z.object({
    primary_card_enabled: z.boolean(),
    reimbursements_enabled: z.boolean()
});

const ProviderSpendProgramSchema = z.object({
    id: z.string(),
    display_name: z.string(),
    description: z.string(),
    icon: z.string(),
    is_shareable: z.boolean(),
    issue_physical_card_if_needed: z.boolean(),
    permitted_spend_types: ProviderPermittedSpendTypesSchema.nullable(),
    restrictions: ProviderSpendingRestrictionsSchema.nullable()
});

const ProviderMappedFieldSchema = z.object({ mapped_field: z.string() }).passthrough();

const ProviderFieldMappingReferenceSchema = z
    .object({
        node_id: z.string().nullable(),
        remote_system: z.string(),
        approval_trigger_metadata_uuid: z.string()
    })
    .passthrough();

const ProviderCustomFormFieldDefinitionSchema = z
    .object({
        field_type: z.string(),
        choices: z.array(CustomFormChoiceSchema).optional(),
        mapped_fields: z.array(ProviderMappedFieldSchema).optional(),
        document_category: z.string().nullish(),
        allowed_file_types: z.array(z.string()).nullish()
    })
    .passthrough();

const ProviderCustomFormFieldSchema = z.object({
    field_id: z.string(),
    label: z.string(),
    short_title: z.string().nullable(),
    description: z.string().nullable(),
    required: z.boolean(),
    exclude_from_ai_prefill: z.boolean(),
    conditions: z.unknown(),
    required_if_conditions: z.unknown(),
    answer_filter_workflow_definition: z.unknown(),
    default_answer_workflow_definition: z.unknown(),
    is_mapped_to_ironclad_field: z.boolean(),
    is_used_in_approval_workflow_condition: z.boolean(),
    is_used_in_approval_workflow_approval_step: z.boolean(),
    is_used_in_custom_form_workflow_condition: z.boolean(),
    field_mapping_references: z.array(ProviderFieldMappingReferenceSchema),
    attachments: z.array(z.unknown()),
    global_library_field_id: z.string().nullable(),
    disclaimer: z.string().nullable(),
    document_category: z.string().nullable(),
    field: ProviderCustomFormFieldDefinitionSchema
});

const ProviderSpendProgramDetailSchema = ProviderSpendProgramSchema.extend({
    line_item_accounting_fields: z.array(LineItemAccountingFieldSchema),
    line_item_custom_fields: z.array(
        z.object({
            id: z.string(),
            display_name: z.string(),
            description: z.string().nullable(),
            field_type: z.string(),
            is_required: z.boolean()
        })
    ),
    custom_form_collection: z
        .object({
            custom_form_collection_log_entry: z
                .object({
                    label: z.string().nullable(),
                    forms: z.array(
                        z.object({
                            label: z.string().nullable(),
                            fields: z.array(ProviderCustomFormFieldSchema)
                        })
                    )
                })
                .nullable()
        })
        .nullable()
});

function mapCurrencyAmount(amount: z.infer<typeof ProviderCurrencyAmountSchema>): z.infer<typeof CurrencyAmountSchema> {
    return {
        amount: amount.amount,
        currency_code: amount.currency_code,
        ...(amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: amount.minor_unit_conversion_rate })
    };
}

function mapRestrictions(restrictions: z.infer<typeof ProviderSpendingRestrictionsSchema>): z.infer<typeof SpendingRestrictionsSchema> {
    return {
        interval: restrictions.interval,
        ...(restrictions.limit != null && { limit: mapCurrencyAmount(restrictions.limit) }),
        ...(restrictions.temporary_limit != null && { temporary_limit: mapCurrencyAmount(restrictions.temporary_limit) }),
        ...(restrictions.transaction_amount_limit != null && { transaction_amount_limit: mapCurrencyAmount(restrictions.transaction_amount_limit) }),
        ...(restrictions.auto_lock_date != null && { auto_lock_date: restrictions.auto_lock_date }),
        ...(restrictions.start_of_interval != null && { start_of_interval: restrictions.start_of_interval }),
        ...(restrictions.next_interval_reset != null && { next_interval_reset: restrictions.next_interval_reset }),
        allowed_categories: restrictions.allowed_categories,
        blocked_categories: restrictions.blocked_categories,
        allowed_vendors: restrictions.allowed_vendors,
        blocked_vendors: restrictions.blocked_vendors
    };
}

function mapCustomFormField(field: z.infer<typeof ProviderCustomFormFieldSchema>): z.infer<typeof CustomFormFieldSchema> {
    const { document_category: definitionDocumentCategory, allowed_file_types: allowedFileTypes, ...definition } = field.field;

    return {
        field_id: field.field_id,
        label: field.label,
        ...(field.short_title != null && { short_title: field.short_title }),
        ...(field.description != null && { description: field.description }),
        required: field.required,
        exclude_from_ai_prefill: field.exclude_from_ai_prefill,
        ...(field.conditions != null && { conditions: field.conditions }),
        ...(field.required_if_conditions != null && { required_if_conditions: field.required_if_conditions }),
        ...(field.answer_filter_workflow_definition != null && { answer_filter_workflow_definition: field.answer_filter_workflow_definition }),
        ...(field.default_answer_workflow_definition != null && { default_answer_workflow_definition: field.default_answer_workflow_definition }),
        is_mapped_to_ironclad_field: field.is_mapped_to_ironclad_field,
        is_used_in_approval_workflow_condition: field.is_used_in_approval_workflow_condition,
        is_used_in_approval_workflow_approval_step: field.is_used_in_approval_workflow_approval_step,
        is_used_in_custom_form_workflow_condition: field.is_used_in_custom_form_workflow_condition,
        field_mapping_references: field.field_mapping_references.map(({ node_id: nodeId, ...reference }) => ({
            ...reference,
            ...(nodeId != null && { node_id: nodeId })
        })),
        attachments: field.attachments,
        ...(field.global_library_field_id != null && { global_library_field_id: field.global_library_field_id }),
        ...(field.disclaimer != null && { disclaimer: field.disclaimer }),
        ...(field.document_category != null && { document_category: field.document_category }),
        field: {
            ...definition,
            ...(definitionDocumentCategory != null && { document_category: definitionDocumentCategory }),
            ...(allowedFileTypes != null && { allowed_file_types: allowedFileTypes })
        }
    };
}

const InputSchema = z
    .object({
        spend_program_id: z.string().describe('Unique identifier (UUID) of the spend program to retrieve.')
    })
    .describe('Input for retrieving a single spend program by ID.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the spend program.'),
        display_name: z.string().describe('Display name of the spend program.'),
        description: z.string().describe('Description of the spend program.'),
        icon: z.string().describe('Template icon identifier for the spend program.'),
        is_shareable: z.boolean().describe('Whether the spend program is shareable.'),
        issue_physical_card_if_needed: z.boolean().describe('Whether a physical card is issued when the user does not already have one.'),
        permitted_spend_types: PermittedSpendTypesSchema.optional().describe('Permitted spend types for the spend program. Omitted when unspecified.'),
        restrictions: SpendingRestrictionsSchema.optional().describe('Spending restrictions imposed on the spend program. Omitted when none are configured.'),
        line_item_accounting_fields: z.array(LineItemAccountingFieldSchema).describe('Accounting fields enabled for line items in the spend program.'),
        line_item_custom_fields: z.array(LineItemCustomFieldSchema).describe('Custom fields enabled for line items in the spend program.'),
        custom_form_collection: CustomFormCollectionSchema.optional().describe(
            'Custom form questions required to create a request against this spend program. Omitted when the program has no custom form.'
        )
    })
    .describe('A Ramp spend program, including its custom form field definitions.');

/**
 * @tags: [read]
 * @tagReason: Reads a single spend program and its custom form definitions from Ramp; no provider state is modified.
 * @pitfalls: The custom-form conditional-visibility, required-if, and answer-filter/default-answer workflow objects are returned as opaque, configuration-dependent structures that vary per program, so treat them as pass-through data rather than a fixed shape.
 */
const action = createAction({
    description: 'Retrieve a single spend program by ID, including its full custom-form field definitions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['spend_programs:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Docs: https://docs.ramp.com/developer-api/v1/overview/introduction (GET /developer/v1/spend-programs/{spend_program_id})
        const response = await nango.get({
            endpoint: `/developer/v1/spend-programs/${encodeURIComponent(input.spend_program_id)}`,
            retries: 3
        });

        const program = ProviderSpendProgramDetailSchema.parse(response.data);
        const logEntry = program.custom_form_collection?.custom_form_collection_log_entry;

        return {
            id: program.id,
            display_name: program.display_name,
            description: program.description,
            icon: program.icon,
            is_shareable: program.is_shareable,
            issue_physical_card_if_needed: program.issue_physical_card_if_needed,
            ...(program.permitted_spend_types != null && { permitted_spend_types: program.permitted_spend_types }),
            ...(program.restrictions != null && { restrictions: mapRestrictions(program.restrictions) }),
            line_item_accounting_fields: program.line_item_accounting_fields,
            line_item_custom_fields: program.line_item_custom_fields.map((field) => ({
                id: field.id,
                display_name: field.display_name,
                ...(field.description != null && { description: field.description }),
                field_type: field.field_type,
                is_required: field.is_required
            })),
            ...(program.custom_form_collection != null && {
                custom_form_collection: {
                    ...(logEntry != null && {
                        custom_form_collection_log_entry: {
                            ...(logEntry.label != null && { label: logEntry.label }),
                            forms: logEntry.forms.map((form) => ({
                                ...(form.label != null && { label: form.label }),
                                fields: form.fields.map(mapCustomFormField)
                            }))
                        }
                    })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
