import { z } from 'zod';
import type { NangoAction, NangoSync } from 'nango';

const OrganizationSchema = z.object({
    organization_id: z.string(),
    name: z.string().optional(),
    AppList: z.array(z.string()).optional(),
    org_joined_app_list: z.array(z.string()).optional()
});

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    organizations: z.array(OrganizationSchema).optional()
});

const MetadataSchema = z.object({
    organization_id: z.string().optional()
});

type Organization = z.infer<typeof OrganizationSchema>;

type ResolutionResult =
    | { ok: true; organizationId: string }
    | { ok: false; type: 'invalid_response' | 'provider_error' | 'not_found' | 'multiple_organizations'; message: string };

/**
 * The organizations endpoint also returns organizations that only use other Zoho
 * Finance apps (e.g. Books-only). Those cannot serve Inventory requests, so they are
 * excluded. When Zoho omits the app list, the organization is kept.
 */
function isInventoryEnabled(organization: Organization): boolean {
    const apps = organization.AppList ?? organization.org_joined_app_list;
    return apps === undefined || apps.includes('inventory');
}

async function resolveSoleOrganizationId(nango: NangoAction | NangoSync): Promise<ResolutionResult> {
    // Requires the ZohoInventory.settings.READ scope.
    // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
    const response = await nango.get({
        endpoint: '/inventory/v1/organizations',
        retries: 3
    });

    const parsed = OrganizationsResponseSchema.safeParse(response.data);
    if (!parsed.success) {
        return { ok: false, type: 'invalid_response', message: `Unexpected organizations response from Zoho Inventory: ${parsed.error.message}` };
    }

    if (parsed.data.code !== 0) {
        return { ok: false, type: 'provider_error', message: parsed.data.message ?? 'Failed to retrieve organizations from Zoho Inventory.' };
    }

    const organizations = (parsed.data.organizations ?? []).filter(isInventoryEnabled);
    const [organization, ...others] = organizations;

    if (!organization) {
        return { ok: false, type: 'not_found', message: 'No Zoho Inventory organization found for this connection.' };
    }

    if (others.length > 0) {
        return {
            ok: false,
            type: 'multiple_organizations',
            message: `Multiple Zoho Inventory organizations found (${organizations.map((org) => org.organization_id).join(', ')}). Provide organization_id explicitly.`
        };
    }

    return { ok: true, organizationId: organization.organization_id };
}

/**
 * Returns the explicit organization_id when provided, otherwise the connection's only
 * Inventory organization. Throws an ActionError when the organization is ambiguous.
 */
export async function resolveOrganizationId(nango: NangoAction, organizationId?: string): Promise<string> {
    if (organizationId) {
        return organizationId;
    }

    const result = await resolveSoleOrganizationId(nango);
    if (!result.ok) {
        throw new nango.ActionError({
            type: result.type,
            message: result.message
        });
    }

    return result.organizationId;
}

/**
 * Syncs take no input, so the organization comes from connection metadata
 * (`organization_id`) when set, otherwise from the connection's only Inventory
 * organization. Fails rather than silently syncing an arbitrary organization.
 */
export async function resolveSyncOrganizationId(nango: NangoSync): Promise<string> {
    const metadata = MetadataSchema.safeParse(await nango.getMetadata());
    if (metadata.success && metadata.data.organization_id) {
        return metadata.data.organization_id;
    }

    const result = await resolveSoleOrganizationId(nango);
    if (!result.ok) {
        const hint = result.type === 'multiple_organizations' ? ' Set organization_id in the connection metadata.' : '';
        throw new Error(`${result.message}${hint}`);
    }

    return result.organizationId;
}

export const OrganizationMetadataSchema = MetadataSchema.describe('Optional connection metadata selecting the Zoho Inventory organization to sync.');
