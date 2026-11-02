import { z } from 'zod';
import { createTool } from 'nango';
import type { HttpResponse } from 'nango';

const AddressSchema = z
    .object({
        city: z.string().nullable().optional().describe('City or null.'),
        label: z.string().nullable().optional().describe('Address label or null.'),
        state: z.string().nullable().optional().describe('State or region or null.'),
        country: z.string().nullable().optional().describe('Provider-accepted country value or null.'),
        address1: z.string().nullable().optional().describe('First street line or null.'),
        address2: z.string().nullable().optional().describe('Second street line or null.'),
        postalCode: z.string().nullable().optional().describe('Postal code as text, retaining leading zeros.')
    })
    .describe('Postal address of the lead.');

const ContactEmailSchema = z
    .object({
        type: z.string().optional().describe('Optional address label.'),
        email: z.email().describe('Email address.')
    })
    .describe('Email address of the contact.');

const ContactPhoneSchema = z
    .object({
        type: z.string().optional().describe('Optional phone label.'),
        phone: z
            .string()
            .regex(/^\+[1-9][0-9]{1,14}$/)
            .describe('E.164 phone number.')
    })
    .describe('Phone number of the contact.');

const ContactSchema = z
    .object({
        name: z.string().max(1000).nullable().optional().describe('Contact name or null.'),
        title: z.string().max(1000).nullable().optional().describe('Job title or null.'),
        emails: z.array(ContactEmailSchema).optional().describe('Initial email addresses.'),
        phones: z.array(ContactPhoneSchema).optional().describe('Initial phone numbers.')
    })
    .describe('Initial contact to create with the lead.');

// A z.string().regex() key would compile propertyNames with an extra "type": "string"; the approved contract carries only the pattern.
const CustomFieldKeySchema = z.custom<string>((value) => typeof value === 'string' && /^cf_[A-Za-z0-9]+$/.test(value)).meta({ pattern: '^cf_[A-Za-z0-9]+$' });

const InputSchema = z
    .object({
        url: z.string().nullable().optional().describe('Lead website URL or null.'),
        name: z.string().nullable().optional().describe('Lead name; omit for the provider default, null for an unset name.'),
        contacts: z.array(ContactSchema).optional().describe('Initial contacts belonging to the new lead; [] means none.'),
        statusId: z.string().min(1).optional().describe("Lead status ID; omission uses the organization's default first status."),
        addresses: z.array(AddressSchema).optional().describe('Initial addresses; [] means none.'),
        description: z.string().nullable().optional().describe('Ordinary lead description text or null.'),
        customFields: z
            .record(CustomFieldKeySchema, z.unknown().describe('JSON value of the configured field type.'))
            .optional()
            .describe('Field-ID-keyed initial custom values; arrays replace whole multiple-value fields.')
    })
    .describe('Lead to create. All fields are optional; omitted fields fall back to the provider defaults.');

const OutputSchema = z
    .object({
        id: z.string().describe('Created lead ID.'),
        contactIds: z.array(z.string()).describe('IDs of contacts associated with the created lead; no positional correlation to inputs is promised.')
    })
    .describe('Identity of the created lead.');

const ProviderLeadSchema = z.object({
    id: z.string(),
    contact_ids: z.array(z.string())
});

const ProviderHttpErrorSchema = z.object({
    response: z.object({
        status: z.number(),
        data: z.unknown().optional()
    })
});

const ProviderErrorMessageSchema = z.object({
    error: z.string()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new lead with optional nested contacts and addresses in Close, which is a provider mutation; it reads nothing.
 * @pitfalls: Creation does not deduplicate: a repeated call, or a retry after an uncertain failure, creates a duplicate lead. Custom field IDs must exist in the organization's Close configuration and values must match the configured field types, or creation is rejected.
 */
const tool = createTool({
    name: 'create-lead',
    description: 'Create a lead with an optional status, addresses, custom values and initial contacts.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use for a new lead; creation does not deduplicate. Use `update-lead` for existing leads. Initial contacts may be included, but activities, tasks and opportunities must be created separately. Use `get-lead` after creation for current details.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const data: Record<string, unknown> = {};

        if (input.url !== undefined) {
            data['url'] = input.url;
        }
        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.description !== undefined) {
            data['description'] = input.description;
        }
        if (input.statusId !== undefined) {
            data['status_id'] = input.statusId;
        }
        if (input.contacts !== undefined) {
            data['contacts'] = input.contacts;
        }
        if (input.addresses !== undefined) {
            data['addresses'] = input.addresses.map((address) => {
                const providerAddress: Record<string, unknown> = {};
                if (address.city !== undefined) {
                    providerAddress['city'] = address.city;
                }
                if (address.label !== undefined) {
                    providerAddress['label'] = address.label;
                }
                if (address.state !== undefined) {
                    providerAddress['state'] = address.state;
                }
                if (address.country !== undefined) {
                    providerAddress['country'] = address.country;
                }
                if (address.address1 !== undefined) {
                    providerAddress['address_1'] = address.address1;
                }
                if (address.address2 !== undefined) {
                    providerAddress['address_2'] = address.address2;
                }
                if (address.postalCode !== undefined) {
                    providerAddress['zipcode'] = address.postalCode;
                }
                return providerAddress;
            });
        }
        if (input.customFields !== undefined) {
            for (const [fieldId, value] of Object.entries(input.customFields)) {
                data[`custom.${fieldId}`] = value;
            }
        }

        let response: HttpResponse<unknown>;
        // @allowTryCatch: Maps Close HTTP error statuses to the tool's public error codes; unrecognized errors are rethrown unchanged.
        try {
            // https://developer.close.com/openapi.json#POST%20/lead/
            response = await nango.post({
                endpoint: '/v1/lead/',
                data,
                retries: 3
            });
        } catch (error) {
            const httpError = ProviderHttpErrorSchema.safeParse(error);
            if (httpError.success) {
                const { status, data: body } = httpError.data.response;
                const message = ProviderErrorMessageSchema.safeParse(body);
                const detail = message.success ? ` ${message.data.error}` : '';
                if (status === 400) {
                    throw new Error(
                        `bad_request: Close rejected the lead, contact, status or custom field data. Correct the rejected input and configured field types.${detail}`
                    );
                }
                if (status === 401 || status === 403) {
                    throw new Error(`access_denied: Close refused to create the lead. Ask the user for create access.${detail}`);
                }
                if (status === 404) {
                    throw new Error(
                        `not_found: A referenced lead status or custom field is unavailable. Verify the IDs in the organization's Close configuration.${detail}`
                    );
                }
            }
            throw error;
        }

        const lead = ProviderLeadSchema.safeParse(response.data);
        if (!lead.success) {
            throw new Error(
                'write_result_unknown: The creation response could not be mapped. Check `list-leads` and the Close UI before retrying to avoid duplicates.'
            );
        }

        return {
            id: lead.data.id,
            contactIds: lead.data.contact_ids
        };
    }
});

export default tool;
