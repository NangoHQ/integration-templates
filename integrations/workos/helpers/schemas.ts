import { z } from 'zod';

// Shared WorkOS schemas used by more than one action.

// SSO connection option shapes (see create-connection / update-connection).
const KeyPairSchema = z.object({ key: z.string(), cert: z.string() });

export const AttributeMapsSchema = z.object({
    standard_attributes: z
        .object({
            idp_id: z.string().optional(),
            email: z.string().optional(),
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            groups: z.string().nullable().optional(),
            name: z.string().nullable().optional()
        })
        .optional(),
    custom_attributes: z.record(z.string(), z.string()).optional()
});

export const SamlOptionsSchema = z.object({
    idp_metadata_url: z.string().url().optional(),
    acs_url: z.string().url().optional(),
    sp_entity_id: z.string().optional(),
    idp_entity_id: z.string().optional(),
    idp_sso_url: z.string().url().optional(),
    idp_signing_certs: z.array(z.string()).optional(),
    sp_signing_key_pair: KeyPairSchema.optional(),
    sp_encryption_key_pairs: z.array(KeyPairSchema).optional()
});

export const OidcOptionsSchema = z.object({
    discovery_endpoint: z.string().url(),
    client_id: z.string(),
    client_secret: z.string().optional(),
    redirect_uri: z.string().url().optional(),
    pkce: z.boolean().optional(),
    token_authentication_method: z.enum(['client_secret_post', 'client_secret_basic', 'private_key_jwt']).optional(),
    jwt_signing_key_pair: KeyPairSchema.optional(),
    id_token_signature_algorithm: z
        .enum(['ES256', 'ES384', 'ES512', 'EdDSA', 'HS256', 'HS384', 'HS512', 'PS256', 'PS384', 'PS512', 'RS256', 'RS384', 'RS512'])
        .optional(),
    fetch_user_info: z.boolean().optional()
});

// WorkOS `external_id` must be at most 128 ASCII characters. Used on SSO connection create/update.
export const ExternalIdSchema = z
    .string()
    .max(128)
    .refine((value) => Array.from(value).every((character) => character.charCodeAt(0) <= 127), 'External ID must contain only ASCII characters.');

// WorkOS returns two shapes for organization `domains`: a compact embedded form
// (only `object`, `id`, `domain` are guaranteed) and the full `organization_domain`
// resource. Keep identifying fields required and the resource-only fields optional
// so both shapes validate, and use `.passthrough()` to preserve any extra properties.
export const OrganizationDomainSchema = z
    .object({
        object: z.literal('organization_domain'),
        id: z.string(),
        domain: z.string(),
        organization_id: z.string().optional(),
        state: z.string().optional(),
        verification_token: z.string().optional(),
        verification_strategy: z.string().optional(),
        verification_prefix: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();
