import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest currency unit (for USD, cents).'),
    currency_code: z.string().describe('ISO 4217 currency code, for example "USD".'),
    minor_unit_conversion_rate: z
        .number()
        .nullable()
        .describe('Divisor that converts amount to the real currency value (100 for USD), or null when not applicable.')
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
    limit: CurrencyAmountSchema.nullable().describe('Total amount limit per interval, or null when no limit is set.'),
    temporary_limit: CurrencyAmountSchema.nullable().describe('Temporary amount limit per interval, or null when none is set.'),
    transaction_amount_limit: CurrencyAmountSchema.nullable().describe('Maximum amount allowed on a single transaction, or null when none is set.'),
    auto_lock_date: z.string().nullable().describe('ISO 8601 date-time when the spend program auto-locks, or null when it never locks.'),
    start_of_interval: z.string().nullable().describe('ISO 8601 date-time when the current limit interval started, or null when no interval applies.'),
    next_interval_reset: z.string().nullable().describe('ISO 8601 date-time when the limit interval resets next, or null when no interval applies.')
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
    description: z.string().nullable().describe('Description of the custom field, or null when none is set.'),
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
        node_id: z.string().nullable().describe('Workflow node that consumes this question, or null when no node currently uses it.'),
        remote_system: z.string().describe('Integration provider that consumes the mapped question.'),
        approval_trigger_metadata_uuid: z.string().describe('UUID of the approval-step metadata that owns the field mapping.')
    })
    .passthrough();

const CustomFormFieldDefinitionSchema = z
    .object({
        field_type: z.string().describe('Field input type, for example "TEXT", "TEXT_SINGLE_SELECT", "DATE", "BOOLEAN" or "FILE_UPLOAD".'),
        choices: z.array(CustomFormChoiceSchema).optional().describe('Selectable choices for select-style fields.'),
        mapped_fields: z.array(MappedFieldSchema).optional().describe('External fields this question populates.'),
        document_category: z.string().nullable().optional().describe('Document category for file-upload fields, or null when unset.'),
        allowed_file_types: z.array(z.string()).nullable().optional().describe('Allowed file extensions for file-upload fields, or null when unrestricted.')
    })
    .passthrough();

const CustomFormFieldSchema = z.object({
    field_id: z.string().describe('Unique identifier of the question.'),
    label: z.string().describe('Question text shown to the requester.'),
    short_title: z.string().nullable().describe('Optional concise title, or null when none is set.'),
    description: z.string().nullable().describe('Help text for the question, or null when none is set.'),
    required: z.boolean().describe('Whether the question is always required.'),
    exclude_from_ai_prefill: z.boolean().describe('Whether AI intake and document prefill must never answer this question.'),
    conditions: z.unknown().nullable().describe('Conditional-visibility workflow that controls when this question is shown, or null when always shown.'),
    required_if_conditions: z.unknown().nullable().describe('Conditions that make this question required when they evaluate to true, or null when none apply.'),
    answer_filter_workflow_definition: z.unknown().nullable().describe('Workflow that conditionally filters this question choices, or null when unfiltered.'),
    default_answer_workflow_definition: z
        .unknown()
        .nullable()
        .describe('Workflow that conditionally defaults this question answer, or null when no default is set.'),
    is_mapped_to_ironclad_field: z.boolean().describe('Whether the question maps to an Ironclad field.'),
    is_used_in_approval_workflow_condition: z.boolean().describe('Whether the question is used in approval conditions or approval steps.'),
    is_used_in_approval_workflow_approval_step: z.boolean().describe('Whether an approval step selects its approver from this question.'),
    is_used_in_custom_form_workflow_condition: z.boolean().describe('Whether the question is used in a custom form workflow condition.'),
    field_mapping_references: z.array(FieldMappingReferenceSchema).describe('Integration field mappings that reference this question.'),
    attachments: z.array(z.unknown()).describe('Attachments configured on this question.'),
    global_library_field_id: z.string().nullable().describe('Global Question Library field ID, or null when not sourced from the library.'),
    disclaimer: z.string().nullable().describe('Disclaimer text shown with the question, or null when none is set.'),
    document_category: z.string().nullable().describe('Document category for the question, or null when unset.'),
    field: CustomFormFieldDefinitionSchema.describe('Type-specific definition of the question.')
});

const CustomFormSchema = z.object({
    label: z.string().nullable().describe('Label of the custom form, or null when none is set.'),
    fields: z.array(CustomFormFieldSchema).describe('Questions that make up the custom form.')
});

const CustomFormCollectionLogEntrySchema = z.object({
    label: z.string().nullable().describe('Label of the form collection, or null when none is set.'),
    forms: z.array(CustomFormSchema).describe('Custom forms in the collection.')
});

const CustomFormCollectionSchema = z.object({
    custom_form_collection_log_entry: CustomFormCollectionLogEntrySchema.nullable().describe(
        'Latest revision of the form collection, or null when none exists.'
    )
});

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
        permitted_spend_types: PermittedSpendTypesSchema.nullable().describe('Permitted spend types for the spend program, or null when unspecified.'),
        restrictions: SpendingRestrictionsSchema.nullable().describe('Spending restrictions imposed on the spend program, or null when none are configured.'),
        line_item_accounting_fields: z.array(LineItemAccountingFieldSchema).describe('Accounting fields enabled for line items in the spend program.'),
        line_item_custom_fields: z.array(LineItemCustomFieldSchema).describe('Custom fields enabled for line items in the spend program.'),
        custom_form_collection: CustomFormCollectionSchema.nullable().describe(
            'Custom form questions required to create a request against this spend program, or null when the program has no custom form.'
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

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
