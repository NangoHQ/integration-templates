// Generated by ts-to-zod
import { z } from 'zod';

export const timestampsSchema = z.object({
    created_at: z.string(),
    updated_at: z.string()
});

export const utilityAnyTypeSchema = z.record(z.any());

export const locationSchema = z.object({
    city: z.string().optional(),
    country: z.string(),
    state: z.string().optional()
});

export const candidateSchema = z.object({
    id: z.string(),
    object: z.string(),
    uri: z.string(),
    first_name: z.string(),
    middle_name: z.string().nullable(),
    last_name: z.string(),
    mother_maiden_name: z.string(),
    email: z.string(),
    phone: z.number(),
    zipcode: z.number(),
    dob: z.string(),
    ssn: z.string(),
    driver_license_number: z.string(),
    driver_license_state: z.string(),
    previous_driver_license_number: z.string(),
    previous_driver_license_state: z.string(),
    copy_requested: z.boolean(),
    custom_id: z.string(),
    report_ids: z.array(z.string()),
    geo_ids: z.array(z.string()),
    adjudication: z.string(),
    metadata: utilityAnyTypeSchema
});

export const createCandidateSchema = z.object({
    city: z.string().optional(),
    country: z.string(),
    state: z.string().optional(),
    first_name: z.string(),
    middle_name: z.string().optional(),
    no_middle_name: z.boolean().optional(),
    last_name: z.string(),
    email: z.string(),
    phone: z.string(),
    zipcode: z.string(),
    dob: z.string(),
    ssn: z.string(),
    driver_license_number: z.string(),
    driver_license_state: z.string(),
    work_locations: z.array(locationSchema)
});

export const backgroundCheckSchema = z.object({
    id: z.string(),
    status: z.string(),
    service_key: z.string(),
    url: z.string(),
    candidate_id: z.string(),
    created_at: z.string(),
    expires_at: z.union([z.string(), z.undefined()]).optional()
});

export const checkrTriggeredBackgroundCheckSchema = z.object({
    created_at: z.string(),
    updated_at: z.string(),
    id: z.string(),
    object: z.string(),
    uri: z.string(),
    invitation_url: z.string(),
    status: z.string(),
    completed_at: z.string().nullable(),
    deleted_at: z.string().nullable(),
    package: z.string(),
    candidate_id: z.string(),
    report_id: z.string().nullable(),
    archived: z.boolean(),
    expires_at: z.string().optional(),
    archived_info: z.object({
        time: z.string(),
        user: z.object({
            email: z.string(),
            id: z.string()
        })
    })
});

export const backgroundCheckParametersInputSchema = z.object({
    service_key: z.string()
});

export const triggeredBackgroundCheckSchema = z.object({
    created_at: z.string(),
    updated_at: z.string(),
    applicationId: z.any(),
    url: z.string(),
    status: z.string(),
    completed_at: z.string().nullable(),
    candidate_id: z.string(),
    service_key: z.string(),
    deleted_at: z.string().nullable()
});

export const triggerBackgroundCheckInputSchema = z.object({
    city: z.string().optional(),
    country: z.string(),
    state: z.string().optional(),
    service_key: z.string(),
    candidate_id: z.string(),
    node: z.string().optional(),
    tags: z.array(z.string()).optional()
});

export const backgroundCheckParametersSchema = z.object({
    key: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string(),
    required: z.boolean()
});

export const backgroundCheckParameterResponseSchema = z.object({
    parameters: z.array(backgroundCheckParametersSchema)
});

export const checkrScreeningSchema = z.object({
    type: z.string(),
    subtype: z.string().nullable()
});

export const checkrServiceSchema = z.object({
    id: z.string(),
    price: z.number(),
    drug_screening_price: z.number().nullable(),
    enabled_examples: z.array(z.string()),
    requires_observed_drug_test: z.boolean(),
    object: z.string(),
    apply_url: z.string(),
    created_at: z.string(),
    deleted_at: z.string().nullable(),
    name: z.string(),
    screenings: z.array(checkrScreeningSchema),
    slug: z.string(),
    uri: z.string(),
    node: z.string().optional()
});

export const checkrServicesResponseSchema = z.object({
    services: z.array(checkrServiceSchema)
});
