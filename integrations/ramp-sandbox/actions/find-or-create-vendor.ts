import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().min(1).describe('Exact vendor name to look up or create. Example: "Figma"'),
        country: z
            .string()
            .min(2)
            .max(2)
            .optional()
            .describe('Two-letter country code for the vendor to create (e.g. "US"). Required only when no exact-name match exists.'),
        state: z.string().min(2).max(2).optional().describe('Two-letter US state code (e.g. "CA"). Required when creating a vendor whose country is "US".'),
        business_vendor_contacts_email: z
            .string()
            .email()
            .optional()
            .describe('Email of the primary vendor contact. Required only when no exact-name match exists.')
    })
    .describe('Input for finding a vendor by exact name or creating one when no exact match exists.');

const ProviderVendorSchema = z.object({
    id: z.string(),
    name: z.string(),
    name_legal: z.string().nullish(),
    country: z.string().nullish(),
    state: z.string().nullish(),
    status: z.string().nullish(),
    is_active: z.boolean().nullish(),
    is_deletable: z.boolean().nullish(),
    description: z.string().nullish(),
    external_vendor_id: z.string().nullish(),
    merchant_id: z.string().nullish(),
    vendor_owner_id: z.string().nullish(),
    default_entity_id: z.string().nullish(),
    accounting_vendor_remote_id: z.string().nullish(),
    parent_vendor_id: z.string().nullish(),
    sk_category_id: z.number().nullish(),
    sk_category_name: z.string().nullish(),
    vendor_type: z.string().nullish(),
    federal_tax_classification: z.string().nullish(),
    contacts: z.array(z.string()).nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish()
});

const PaginatedVendorsSchema = z.object({
    data: z.array(ProviderVendorSchema),
    page: z.object({
        next: z.string().nullish()
    })
});

const VendorSchema = z.object({
    id: z.string().describe('Unique identifier of the vendor.'),
    name: z.string().describe('Vendor name as stored in Ramp.'),
    name_legal: z.string().optional().describe('Legal name of the vendor, if different from the display name.'),
    country: z.string().optional().describe('Two-letter country code of the vendor.'),
    state: z.string().optional().describe('Two-letter US state code of the vendor.'),
    status: z.string().optional().describe('Vendor lifecycle status reported by Ramp.'),
    is_active: z.boolean().optional().describe('Whether the vendor is active.'),
    is_deletable: z.boolean().optional().describe('Whether the vendor can be deleted.'),
    description: z.string().optional().describe('Free-text description of the vendor.'),
    external_vendor_id: z.string().optional().describe('Caller-defined external vendor identifier.'),
    merchant_id: z.string().optional().describe('Identifier of the linked card merchant, if any.'),
    vendor_owner_id: z.string().optional().describe('Identifier of the user who owns the vendor.'),
    default_entity_id: z.string().optional().describe('Identifier of the default business entity associated with the vendor.'),
    accounting_vendor_remote_id: z.string().optional().describe('Accounting-system remote id of the vendor.'),
    parent_vendor_id: z.string().optional().describe('Identifier of the parent vendor, if any.'),
    sk_category_id: z.number().optional().describe('Ramp spend category id assigned to the vendor.'),
    sk_category_name: z.string().optional().describe('Ramp spend category name assigned to the vendor.'),
    vendor_type: z.string().optional().describe('Vendor type, for example "BUSINESS" or "INDIVIDUAL".'),
    federal_tax_classification: z.string().optional().describe('Federal tax classification of the vendor.'),
    contacts: z.array(z.string()).optional().describe('Identifiers of contacts associated with the vendor.'),
    created_at: z.string().optional().describe('ISO-8601 timestamp of when the vendor was created.'),
    updated_at: z.string().optional().describe('ISO-8601 timestamp of when the vendor was last updated.')
});

const OutputSchema = z
    .object({
        created: z.boolean().describe('True when a new vendor was created, false when an existing vendor was reused.'),
        multiple_matches_warning: z
            .boolean()
            .describe('True when more than one vendor matched the exact name, so the caller should disambiguate before using the vendor.'),
        matching_vendors: z
            .array(VendorSchema)
            .describe('All vendors whose name exactly matches the requested name (case-insensitive). Empty when a new vendor was created.'),
        vendor: VendorSchema.describe('The reused first exact match, or the newly created vendor.')
    })
    .describe('Result of the vendor lookup, including the resolved vendor, whether it was created, and any duplicate-name warning.');

function toVendor(vendor: z.infer<typeof ProviderVendorSchema>): z.infer<typeof VendorSchema> {
    return {
        id: vendor.id,
        name: vendor.name,
        ...(vendor.name_legal != null && { name_legal: vendor.name_legal }),
        ...(vendor.country != null && { country: vendor.country }),
        ...(vendor.state != null && { state: vendor.state }),
        ...(vendor.status != null && { status: vendor.status }),
        ...(vendor.is_active != null && { is_active: vendor.is_active }),
        ...(vendor.is_deletable != null && { is_deletable: vendor.is_deletable }),
        ...(vendor.description != null && { description: vendor.description }),
        ...(vendor.external_vendor_id != null && { external_vendor_id: vendor.external_vendor_id }),
        ...(vendor.merchant_id != null && { merchant_id: vendor.merchant_id }),
        ...(vendor.vendor_owner_id != null && { vendor_owner_id: vendor.vendor_owner_id }),
        ...(vendor.default_entity_id != null && { default_entity_id: vendor.default_entity_id }),
        ...(vendor.accounting_vendor_remote_id != null && { accounting_vendor_remote_id: vendor.accounting_vendor_remote_id }),
        ...(vendor.parent_vendor_id != null && { parent_vendor_id: vendor.parent_vendor_id }),
        ...(vendor.sk_category_id != null && { sk_category_id: vendor.sk_category_id }),
        ...(vendor.sk_category_name != null && { sk_category_name: vendor.sk_category_name }),
        ...(vendor.vendor_type != null && { vendor_type: vendor.vendor_type }),
        ...(vendor.federal_tax_classification != null && { federal_tax_classification: vendor.federal_tax_classification }),
        ...(vendor.contacts != null && { contacts: vendor.contacts }),
        ...(vendor.created_at != null && { created_at: vendor.created_at }),
        ...(vendor.updated_at != null && { updated_at: vendor.updated_at })
    };
}

/**
 * @tags: [read, write]
 * @tagReason: Reads existing vendors by name and creates a new vendor when no exact match exists.
 * @pitfalls: Vendor names are not unique and Ramp's name search is a case-insensitive substring match, so only exact-name results count as matches and duplicates are merely flagged via multiple_matches_warning; a US vendor cannot be created without state; a vendor created by this action may not appear in subsequent default name searches until its creation approval completes.
 */
const action = createAction({
    description: 'Find a vendor by exact name or create it when missing, flagging ambiguous duplicate names.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const targetName = input.name.trim();
        const matches: z.infer<typeof ProviderVendorSchema>[] = [];
        let start: string | undefined = undefined;

        for (let page = 0; page < 20; page++) {
            const response = await nango.get({
                // https://docs.ramp.com/developer-api/v1/api-reference/vendors/list-vendors
                endpoint: '/developer/v1/vendors',
                params: {
                    name: targetName,
                    page_size: 100,
                    ...(start !== undefined && { start })
                },
                retries: 3
            });

            const parsed = PaginatedVendorsSchema.parse(response.data);
            for (const vendor of parsed.data) {
                if (vendor.name.trim().toLowerCase() === targetName.toLowerCase()) {
                    matches.push(vendor);
                }
            }

            const next = parsed.page.next;
            if (next == null) {
                break;
            }

            const startMatch = /[?&]start=([^&]+)/.exec(next);
            const nextStart = startMatch?.[1];
            if (nextStart == null) {
                break;
            }
            start = decodeURIComponent(nextStart);
        }

        if (matches.length > 0) {
            const first = matches[0];
            if (first === undefined) {
                throw new nango.ActionError({
                    type: 'unexpected_empty_matches',
                    message: `Vendor lookup for "${targetName}" produced an inconsistent result.`
                });
            }

            return {
                created: false,
                multiple_matches_warning: matches.length > 1,
                matching_vendors: matches.map(toVendor),
                vendor: toVendor(first)
            };
        }

        const missing: string[] = [];
        if (input.country == null) {
            missing.push('country');
        }
        if (input.business_vendor_contacts_email == null) {
            missing.push('business_vendor_contacts_email');
        }
        const country = input.country?.toUpperCase();
        if (country === 'US' && input.state == null) {
            missing.push('state');
        }
        if (missing.length > 0) {
            throw new nango.ActionError({
                type: 'missing_create_fields',
                message: `No vendor named "${targetName}" was found and a new vendor cannot be created without: ${missing.join(', ')}.`,
                missing_fields: missing
            });
        }

        const createResponse = await nango.post({
            // https://docs.ramp.com/developer-api/v1/api-reference/vendors/create-a-new-vendor
            endpoint: '/developer/v1/vendors',
            data: {
                name: targetName,
                country,
                business_vendor_contacts: {
                    email: input.business_vendor_contacts_email
                },
                ...(input.state != null && { state: input.state.toUpperCase() })
            },
            // Non-idempotent create: retrying after a lost response could create a duplicate vendor.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries must remain 0 for this non-idempotent create
            retries: 0
        });

        const created = ProviderVendorSchema.parse(createResponse.data);

        return {
            created: true,
            multiple_matches_warning: false,
            matching_vendors: [],
            vendor: toVendor(created)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
