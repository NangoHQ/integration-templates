import { z } from 'zod';
import { createTool } from 'nango';

const AddressSchema = z.object({
    city: z.string().nullable().optional().describe('Locality or city.'),
    unit: z.string().nullable().optional().describe('Apartment or suite.'),
    value: z.string().optional().describe('Full formatted address.'),
    region: z.string().nullable().optional().describe('First administrative area.'),
    street: z.string().nullable().optional().describe('Street or route.'),
    country: z.string().nullable().optional().describe('Country component.'),
    district: z.string().nullable().optional().describe('Second administrative area.'),
    postalCode: z.string().nullable().optional().describe('Postal code.'),
    neighborhood: z.string().nullable().optional().describe('Sublocality or neighborhood.'),
    streetNumber: z.string().nullable().optional().describe('Street number.')
});

const ChangesSchema = z
    .object({
        name: z.string().min(1).optional().describe('Replacement display name.'),
        address: AddressSchema.nullable().optional().describe('Complete replacement address value; null clears it.'),
        ownerId: z
            .string()
            .regex(/^[0-9]+$/)
            .optional()
            .describe('Replacement owning user ID.'),
        website: z.string().nullable().optional().describe('Replacement website; null clears it, empty remains empty text.'),
        labelIds: z
            .array(z.string().regex(/^[0-9]+$/))
            .refine((ids) => new Set(ids).size === ids.length, { message: 'labelIds must contain unique values' })
            .meta({ uniqueItems: true })
            .optional()
            .describe('Complete replacement label set; [] clears all labels.'),
        linkedin: z.string().nullable().optional().describe('Replacement LinkedIn URL; null clears it.'),
        industryId: z
            .string()
            .regex(/^[0-9]+$/)
            .nullable()
            .optional()
            .describe('Replacement industry identifier; null clears it.'),
        customFields: z
            .record(z.string(), z.unknown())
            .refine((fields) => Object.keys(fields).length >= 1, { message: 'customFields must change at least one key' })
            .meta({ minProperties: 1 })
            .optional()
            .describe('Custom-field changes keyed by hash; omitted keys are preserved, null clears a key; [] is not allowed for a set field.'),
        annualRevenue: z.number().int().nullable().optional().describe('Replacement provider annual revenue value; null clears it, no currency conversion.'),
        employeeCount: z.number().int().nullable().optional().describe('Replacement employee count; null clears it.'),
        visibilityCode: z.number().int().optional().describe('Replacement provider visibility code.')
    })
    .refine((changes) => Object.keys(changes).length >= 1, { message: 'changes must modify at least one field' })
    .meta({ minProperties: 1 })
    .describe('Partial changes; omitted fields are preserved.');

const InputSchema = z
    .object({
        organizationId: z
            .string()
            .regex(/^[0-9]+$/)
            .describe('ID of the organization to modify.'),
        changes: ChangesSchema
    })
    .describe('Partial update of one organization: the organization ID plus the changes to apply.');

const OutputSchema = z
    .object({
        id: z.string().describe('Updated organization ID; get-organization returns its current details.')
    })
    .describe('Result of the organization update.');

const UpdateOrganizationResponseSchema = z.object({
    success: z.boolean().optional(),
    data: z
        .object({
            id: z.number().int()
        })
        .optional()
});

const ProxyErrorSchema = z.looseObject({
    response: z
        .looseObject({
            status: z.number().optional(),
            data: z.unknown().optional()
        })
        .optional()
});

const ProviderErrorBodySchema = z.looseObject({
    error: z.string()
});

function mapAddress(address: z.infer<typeof AddressSchema>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    if (address.value !== undefined) {
        mapped['value'] = address.value;
    }
    if (address.country !== undefined) {
        mapped['country'] = address.country;
    }
    if (address.region !== undefined) {
        mapped['admin_area_level_1'] = address.region;
    }
    if (address.district !== undefined) {
        mapped['admin_area_level_2'] = address.district;
    }
    if (address.city !== undefined) {
        mapped['locality'] = address.city;
    }
    if (address.neighborhood !== undefined) {
        mapped['sublocality'] = address.neighborhood;
    }
    if (address.street !== undefined) {
        mapped['route'] = address.street;
    }
    if (address.streetNumber !== undefined) {
        mapped['street_number'] = address.streetNumber;
    }
    if (address.unit !== undefined) {
        mapped['subpremise'] = address.unit;
    }
    if (address.postalCode !== undefined) {
        mapped['postal_code'] = address.postalCode;
    }
    return mapped;
}

/**
 * @tags: [write, destructive]
 * @tagReason: Sends a PATCH that overwrites the supplied organization fields in Pipedrive; null values and an empty label set clear existing data, which is difficult to reverse.
 * @pitfalls: Supplying an address replaces the entire address: Pipedrive sets any omitted address component to null, so include every component you want to keep. Pipedrive rejects an empty array [] for multi-option (set) custom fields; send null to clear the selection.
 */
const tool = createTool({
    name: 'update-organization',
    description: "Partially modify an organization's properties, labels, address or custom values.",
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Obtain organizationId from `list-organizations` or `search-organizations`. Use `get-organization` to inspect current values. Only supplied fields change; labelIds replaces the label set and address replaces the address value. Null clears nullable fields; null clears a custom selection, not []. This can overwrite existing information.',
        requiredScopes: ['contacts:full'],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;
        const changes = input.changes;

        const body: Record<string, unknown> = {};
        if (changes.name !== undefined) {
            body['name'] = changes.name;
        }
        if (changes.ownerId !== undefined) {
            body['owner_id'] = Number.parseInt(changes.ownerId, 10);
        }
        if (changes.visibilityCode !== undefined) {
            body['visible_to'] = changes.visibilityCode;
        }
        if (changes.labelIds !== undefined) {
            body['label_ids'] = changes.labelIds.map((labelId) => Number.parseInt(labelId, 10));
        }
        if (changes.address !== undefined) {
            body['address'] = changes.address === null ? null : mapAddress(changes.address);
        }
        if (changes.website !== undefined) {
            body['website'] = changes.website;
        }
        if (changes.linkedin !== undefined) {
            body['linkedin'] = changes.linkedin;
        }
        if (changes.industryId !== undefined) {
            body['industry'] = changes.industryId === null ? null : Number.parseInt(changes.industryId, 10);
        }
        if (changes.annualRevenue !== undefined) {
            body['annual_revenue'] = changes.annualRevenue;
        }
        if (changes.employeeCount !== undefined) {
            body['employee_count'] = changes.employeeCount;
        }
        if (changes.customFields !== undefined) {
            body['custom_fields'] = changes.customFields;
        }

        let response;
        // @allowTryCatch: provider HTTP failures must be translated into the tool's public error codes (not_found, permission_denied, invalid_field_value).
        try {
            // https://developers.pipedrive.com/docs/api/v1/Organizations#updateOrganization
            response = await nango.patch({
                endpoint: `/v2/organizations/${encodeURIComponent(input.organizationId)}`,
                data: body,
                // Not idempotent: Pipedrive has no idempotency key and retrying after a lost response would repeat the mutation.
                retries: 0
            });
        } catch (err) {
            const parsedError = ProxyErrorSchema.safeParse(err);
            const status = parsedError.success ? parsedError.data.response?.status : undefined;
            const errorData = parsedError.success ? parsedError.data.response?.data : undefined;
            const parsedBody = ProviderErrorBodySchema.safeParse(errorData);
            const detail = parsedBody.success ? ` ${parsedBody.data.error}` : '';
            if (status === 404) {
                throw new Error(`not_found: Organization ${input.organizationId} is missing or unavailable.${detail}`);
            }
            if (status === 403) {
                throw new Error(`permission_denied: The connection cannot update this organization or the requested ownership/visibility.${detail}`);
            }
            if (status === 400 || status === 422) {
                throw new Error(
                    `invalid_field_value: A reference or field value was rejected by Pipedrive.${detail} Use null rather than [] to clear a set custom field.`
                );
            }
            throw err;
        }

        const parsed = UpdateOrganizationResponseSchema.safeParse(response.data);
        if (!parsed.success || parsed.data.data === undefined) {
            throw new Error(
                'write_result_unknown: The update response from Pipedrive could not be interpreted. Use get-organization to inspect the current state before retrying.'
            );
        }

        return { id: String(parsed.data.data.id) };
    }
});

export default tool;
