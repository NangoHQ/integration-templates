import { z } from 'zod';
import { createAction } from 'nango';

const DropdownOptionSchema = z.object({
    value: z.string().describe('Selectable option value. Example: "High"'),
    color: z.string().optional().describe('Color assigned to the option in the Wrike UI. Example: "Red"')
});

const CustomFieldSettingsSchema = z.object({
    readOnly: z.boolean().describe('Whether the custom field value is read-only'),
    inheritanceType: z.string().optional().describe('Where the field is inherited: "All", "Tasks", "Projects", or "Folders"'),
    applicableEntityTypes: z.array(z.string()).optional().describe('Entity types the field applies to, e.g. "WorkItem" or "User"'),
    values: z.array(z.string()).optional().describe('Dropdown values without colors; only present for DropDown and MultipleSelect fields'),
    options: z.array(DropdownOptionSchema).optional().describe('Dropdown options with colors; only present for DropDown and MultipleSelect fields'),
    optionColorsEnabled: z.boolean().optional().describe('Whether option colors are enabled; only present for DropDown and MultipleSelect fields'),
    allowOtherValues: z.boolean().optional().describe('Whether users may enter values outside the defined dropdown options'),
    decimalPlaces: z.number().optional().describe('Number of decimal places; only present for Numeric, Percentage, and Currency fields'),
    useThousandsSeparator: z.boolean().optional().describe('Whether a thousands separator is used; only present for Numeric fields'),
    currency: z.string().optional().describe('Currency code such as "USD" or "EUR"; only present for Currency fields'),
    aggregation: z.string().optional().describe('How values roll up: "Average", "Sum", or "None"'),
    allowTime: z.boolean().optional().describe('Whether users may enter a time component; only present for Date fields'),
    timezone: z.string().optional().describe('Timezone id such as "America/New_York"; only present for Date fields'),
    contacts: z.array(z.string()).optional().describe('Allowed user or invitation IDs; only present for Contacts fields')
});

const CustomFieldSchema = z.object({
    id: z.string().describe('Unique custom field identifier'),
    accountId: z.string().describe('Identifier of the Wrike account that owns the field'),
    title: z.string().describe('Display name of the custom field'),
    type: z.string().describe('Custom field type, e.g. "DropDown", "Currency", "Numeric", or "Text"'),
    spaceId: z.string().optional().describe('Space the field is scoped to; omitted for account-wide fields'),
    description: z.string().optional().describe('Description of the custom field'),
    archived: z.boolean().optional().describe('Whether the custom field is archived'),
    archivedOn: z.string().optional().describe('ISO date when the field was archived, if archived'),
    archivedBy: z.string().optional().describe('User ID that archived the field, if archived'),
    sharedIds: z.array(z.string()).optional().describe('IDs of users the field is shared with (obsolete; prefer sharing)'),
    sharing: z.record(z.string(), z.unknown()).optional().describe('Access settings controlling who can read or write the field'),
    settings: CustomFieldSettingsSchema.describe('Type-specific configuration for the field, including dropdown options, currency, and numeric settings')
});

const InputSchema = z
    .object({
        customFieldId: z.string().min(1).describe('ID of the custom field definition to retrieve. Example: "ABCDEFGHIJKLMNOP"')
    })
    .describe('Input for retrieving a single custom field definition by its ID.');

const OutputSchema = CustomFieldSchema.describe(
    'A Wrike custom field definition, including its type-specific settings such as dropdown options, currency, and numeric configuration.'
);

const ProviderResponseSchema = z.object({
    data: z.array(CustomFieldSchema)
});

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing custom field definition from Wrike without modifying any provider data.
 * @pitfalls: A malformed or unknown custom field ID returns HTTP 400 "invalid_request" rather than 404, so callers should not rely on a 404 status to detect a missing field.
 */
const action = createAction({
    description: 'Retrieve a single custom field definition by ID, including its configured dropdown options, currency, and numeric settings.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.wrike.com/reference/getcustomfieldsmulti
        const response = await nango.get({
            endpoint: `/customfields/${encodeURIComponent(input.customFieldId)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const customField = parsed.data[0];

        if (!customField) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Custom field ${input.customFieldId} was not found`
            });
        }

        return customField;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
