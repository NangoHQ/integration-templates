import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

/**
 * Creates a new company record in Attio.
 * API Docs: https://docs.attio.com/rest-api/endpoint-reference/records/create-a-record
 */

// Input schema - company fields based on Attio standard object
const CreateCompanyInput = z.object({
    name: z.string(),
    domains: z.array(z.string()).optional(),
    description: z.string().optional()
});

// Attio record ID structure
const RecordId = z.object({
    workspace_id: z.string(),
    object_id: z.string(),
    record_id: z.string()
});

// Output schema
const CreateCompanyOutput = z.object({
    id: RecordId,
    name: z.union([z.string(), z.null()]),
    domains: z.array(z.string()),
    description: z.union([z.string(), z.null()]),
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
    domain?: string;
    original_value?: string;
}

const action = createAction({
    description: 'Creates a new company record in Attio',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/companies',
        group: 'Companies'
    },

    input: CreateCompanyInput,
    output: CreateCompanyOutput,
    scopes: ['record_permission:read-write', 'object_configuration:read'],

    exec: async (nango, input): Promise<z.infer<typeof CreateCompanyOutput>> => {
        // Build values object with only provided fields
        const values: Record<string, unknown> = {
            name: input.name
        };

        // Add domains if provided
        if (input.domains && input.domains.length > 0) {
            values['domains'] = input.domains.map(d => ({ domain: d }));
        }

        // Add optional text fields
        if (input.description) {
            values['description'] = input.description;
        }

        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/records/create-a-record
            endpoint: 'v2/objects/companies/records',
            data: {
                data: {
                    values
                }
            },
            retries: 3
        };

        const response = await nango.post<AttioRecordResponse>(config);
        const record = response.data.data;

        // Extract domains from response
        const responseDomains: string[] = [];
        const domainValues = record.values['domains'];
        if (domainValues && Array.isArray(domainValues)) {
            for (const d of domainValues) {
                if (d.domain) {
                    responseDomains.push(d.domain);
                }
            }
        }

        return {
            id: {
                workspace_id: record.id.workspace_id,
                object_id: record.id.object_id,
                record_id: record.id.record_id
            },
            name: getAttributeValue(record.values['name']) ?? null,
            domains: responseDomains,
            description: getAttributeValue(record.values['description']) ?? null,
            created_at: record.created_at,
            web_url: record.web_url
        };
    }
});

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
