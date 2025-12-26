import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

/**
 * Creates a new person record in Attio.
 * API Docs: https://docs.attio.com/rest-api/endpoint-reference/records/create-a-record
 */

// Input schema - person fields based on Attio standard object
const CreatePersonInput = z.object({
    first_name: z.string(),
    last_name: z.string(),
    email_addresses: z.array(z.string()).optional(),
    phone_numbers: z.array(z.string()).optional(),
    job_title: z.string().optional()
});

// Attio record ID structure
const RecordId = z.object({
    workspace_id: z.string(),
    object_id: z.string(),
    record_id: z.string()
});

// Output schema
const CreatePersonOutput = z.object({
    id: RecordId,
    name: z.union([z.string(), z.null()]),
    email: z.union([z.string(), z.null()]),
    phone: z.union([z.string(), z.null()]),
    job_title: z.union([z.string(), z.null()]),
    created_at: z.string(),
    web_url: z.string()
});

// Attio API response types
interface AttioRecordResponse {
    data: {
        id: {
            workspace_id: string;
            object_id: string;
            record_id: string;
        };
        created_at: string;
        web_url: string;
        values: Record<string, AttioAttributeValue[]>;
    };
}

interface AttioAttributeValue {
    value?: string;
    original_value?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email_address?: string;
    phone_number?: string;
    original_phone_number?: string;
}

const action = createAction({
    description: 'Creates a new person record in Attio',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/people',
        group: 'People'
    },

    input: CreatePersonInput,
    output: CreatePersonOutput,
    scopes: ['record_permission:read-write', 'object_configuration:read'],

    exec: async (nango, input): Promise<z.infer<typeof CreatePersonOutput>> => {
        // Build values object with only provided fields
        const values: Record<string, unknown> = {
            // Personal name attribute
            name: {
                first_name: input.first_name,
                last_name: input.last_name,
                full_name: `${input.first_name} ${input.last_name}`
            }
        };

        // Add email addresses if provided
        if (input.email_addresses && input.email_addresses.length > 0) {
            values['email_addresses'] = input.email_addresses.map((email) => ({
                email_address: email
            }));
        }

        // Add phone numbers if provided
        if (input.phone_numbers && input.phone_numbers.length > 0) {
            values['phone_numbers'] = input.phone_numbers.map((phone) => ({
                original_phone_number: phone
            }));
        }

        // Add optional text fields
        if (input.job_title) {
            values['job_title'] = input.job_title;
        }

        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/records/create-a-record
            endpoint: 'v2/objects/people/records',
            data: {
                data: {
                    values
                }
            },
            retries: 3
        };

        const response = await nango.post<AttioRecordResponse>(config);
        const record = response.data.data;

        return {
            id: {
                workspace_id: record.id.workspace_id,
                object_id: record.id.object_id,
                record_id: record.id.record_id
            },
            name: getPersonName(record.values['name']) ?? null,
            email: getEmailAddress(record.values['email_addresses']) ?? null,
            phone: getPhoneNumber(record.values['phone_numbers']) ?? null,
            job_title: getAttributeValue(record.values['job_title']) ?? null,
            created_at: record.created_at,
            web_url: record.web_url
        };
    }
});

function getPersonName(attr: AttioAttributeValue[] | undefined): string | null {
    if (!attr || attr.length === 0) {
        return null;
    }
    const value = attr[0];
    if (!value) {
        return null;
    }
    if (value.full_name) {
        return value.full_name;
    }
    if (value.first_name && value.last_name) {
        return `${value.first_name} ${value.last_name}`.trim();
    }
    return null;
}

function getEmailAddress(attr: AttioAttributeValue[] | undefined): string | null {
    if (!attr || attr.length === 0) {
        return null;
    }
    const value = attr[0];
    if (!value) {
        return null;
    }
    if (value.email_address) {
        return value.email_address;
    }
    return null;
}

function getPhoneNumber(attr: AttioAttributeValue[] | undefined): string | null {
    if (!attr || attr.length === 0) {
        return null;
    }
    const value = attr[0];
    if (!value) {
        return null;
    }
    if (value.phone_number) {
        return value.phone_number;
    }
    if (value.original_phone_number) {
        return value.original_phone_number;
    }
    return null;
}

function getAttributeValue(attr: AttioAttributeValue[] | undefined): string | null {
    if (!attr || attr.length === 0) {
        return null;
    }
    const value = attr[0];
    if (!value) {
        return null;
    }
    if (value.value) {
        return value.value;
    }
    if (value.original_value) {
        return value.original_value;
    }
    return null;
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
