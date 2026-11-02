import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ApplicationModel = z
    .object({
        id: z.string().describe('Opaque application instance ID.'),
        name: z.string().optional().describe('System-assigned application definition name when available.'),
        label: z.string().describe('Application display name.'),
        status: z.string().optional().describe('Application lifecycle state.'),
        profile: z.record(z.string(), z.unknown()).optional().describe('Custom application JSON profile when available; not encrypted at Okta.'),
        features: z.array(z.string()).optional().describe('Enabled feature names.'),
        settings: z.record(z.string(), z.unknown()).optional().describe('Non-secret application-type-specific configuration when available.'),
        createdAt: z.iso.datetime({ offset: true }).optional().describe('Creation instant normalized to UTC, preserving fractional precision.'),
        licensing: z.record(z.string(), z.unknown()).optional().describe('Application licensing configuration.'),
        updatedAt: z.iso.datetime({ offset: true }).optional().describe('Last modification instant normalized to UTC, preserving fractional precision.'),
        signOnMode: z.string().describe('Authentication mode for the application.'),
        visibility: z.record(z.string(), z.unknown()).optional().describe('Dashboard and mobile visibility configuration.'),
        accessibility: z.record(z.string(), z.unknown()).optional().describe('Self-service and redirect settings.'),
        universalLogout: z.record(z.string(), z.unknown()).optional().describe('Universal Logout capabilities and state.'),
        expressConfiguration: z.record(z.string(), z.unknown()).optional().describe('Express Configuration supported and enabled capabilities.')
    })
    .describe('An Okta application instance with inventory, lifecycle, features, and non-secret configuration.');

// Internal schema for the provider payload. Concrete app subtypes (SAML, OIDC, SWA, ...)
// extend the base Application schema with `name`, `settings`, and `credentials`; `credentials`,
// `_links`, `_embedded`, and other unknown keys are stripped here and never synced.
const OktaApplicationSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    label: z.string(),
    status: z.string().nullish(),
    profile: z.record(z.string(), z.unknown()).nullish(),
    features: z.array(z.string()).nullish(),
    settings: z.record(z.string(), z.unknown()).nullish(),
    licensing: z.record(z.string(), z.unknown()).nullish(),
    visibility: z.record(z.string(), z.unknown()).nullish(),
    accessibility: z.record(z.string(), z.unknown()).nullish(),
    universalLogout: z.record(z.string(), z.unknown()).nullish(),
    expressConfiguration: z.record(z.string(), z.unknown()).nullish(),
    signOnMode: z.string(),
    created: z.string().nullish(),
    lastUpdated: z.string().nullish()
});

const SettingsRecordSchema = z.record(z.string(), z.unknown());

// Exact key names (compared case-insensitively, ignoring `_`, `-`, `.`, and spaces) that carry
// secret credential material if they ever appear in app settings. Deliberately exact so
// non-secret keys such as `passwordField` or `token_endpoint_auth_method` are preserved.
const SECRET_SETTING_KEY_NAMES = new Set([
    'password',
    'passwd',
    'secret',
    'secretkey',
    'clientsecret',
    'sharedsecret',
    'privatekey',
    'signingkey',
    'tokensigningkey',
    'encryptionkey',
    'apikey',
    'apisecret',
    'accesstoken',
    'refreshtoken',
    'bearertoken',
    'token',
    'webhooksecret',
    'credentials'
]);

const RFC3339_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(\.\d+)?([Zz]|[+-]\d{2}:?\d{2})$/;

function normalizeSecretKeyName(key: string): string {
    return key.toLowerCase().replace(/[\s_\-.]/g, '');
}

function redactSecretValues(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => redactSecretValues(item));
    }
    if (typeof value === 'object' && value !== null) {
        const redacted: Record<string, unknown> = {};
        for (const key of Object.keys(value)) {
            if (SECRET_SETTING_KEY_NAMES.has(normalizeSecretKeyName(key))) {
                continue;
            }
            redacted[key] = redactSecretValues(Reflect.get(value, key));
        }
        return redacted;
    }
    return value;
}

function redactSettings(settings: Record<string, unknown>): Record<string, unknown> {
    return SettingsRecordSchema.parse(redactSecretValues(settings));
}

// Converts an RFC 3339 timestamp to UTC with a `Z` suffix. The fractional-second digits are
// carried through verbatim because `Date` only tracks milliseconds; offsets are minute-aligned,
// so shifting whole seconds can never change the fraction.
function normalizeToUtc(value: string): string {
    const match = RFC3339_PATTERN.exec(value);
    if (!match) {
        throw new Error(`sync-applications: invalid RFC 3339 timestamp '${value}'`);
    }
    const year = match[1];
    const month = match[2];
    const day = match[3];
    const hour = match[4];
    const minute = match[5];
    const second = match[6];
    const fraction = match[7];
    const offset = match[8];

    let offsetMinutes = 0;
    if (offset && offset !== 'Z' && offset !== 'z') {
        const sign = offset.startsWith('-') ? -1 : 1;
        const digits = offset.slice(1).replace(':', '');
        offsetMinutes = sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4)));
    }

    const utcMs = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)) - offsetMinutes * 60000;
    const utcBase = new Date(utcMs).toISOString().replace(/\.\d{3}Z$/, '');
    return `${utcBase}${fraction ?? ''}Z`;
}

type OktaApplication = z.infer<typeof OktaApplicationSchema>;
type ApplicationRecord = z.infer<typeof ApplicationModel>;

function toRecord(app: OktaApplication): ApplicationRecord {
    const settings = app.settings != null ? redactSettings(app.settings) : undefined;
    const createdAt = app.created != null ? normalizeToUtc(app.created) : undefined;
    const updatedAt = app.lastUpdated != null ? normalizeToUtc(app.lastUpdated) : undefined;

    return {
        id: app.id,
        label: app.label,
        signOnMode: app.signOnMode,
        ...(app.name != null && { name: app.name }),
        ...(app.status != null && { status: app.status }),
        ...(app.profile != null && { profile: app.profile }),
        ...(app.features != null && { features: app.features }),
        ...(settings !== undefined && { settings }),
        ...(app.licensing != null && { licensing: app.licensing }),
        ...(app.visibility != null && { visibility: app.visibility }),
        ...(app.accessibility != null && { accessibility: app.accessibility }),
        ...(app.universalLogout != null && { universalLogout: app.universalLogout }),
        ...(app.expressConfiguration != null && { expressConfiguration: app.expressConfiguration }),
        ...(createdAt !== undefined && { createdAt }),
        ...(updatedAt !== undefined && { updatedAt })
    };
}

const sync = createSync({
    description: 'Make application instance inventory, lifecycle, features, and non-secret configuration available as replicated records.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['okta.apps.read'],
    models: {
        Application: ApplicationModel
    },

    exec: async (nango) => {
        // Full refresh: the applications API has no changed-since filter (filter only supports
        // id, status, credentials.signing.kid, settings.slo.enabled, and name) and no deleted-
        // records feed, so every run walks the whole inventory and deletions are detected with
        // trackDeletes. Pagination always starts from the first page; no cursor is restored and
        // no checkpoint is persisted mid-scan so a crashed run cannot mark live records deleted.
        await nango.trackDeletesStart('Application');

        // https://developer.okta.com/docs/api/openapi/okta-management/management/tags/application/#tag/Application/operation/listApplications
        const proxyConfig: ProxyConfiguration = {
            // https://developer.okta.com/docs/api/openapi/okta-management/management/tags/application/#tag/Application/operation/listApplications
            endpoint: '/api/v1/apps',
            params: {
                includeNonDeleted: 'true'
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'limit',
                limit: 200
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const apps = z.array(OktaApplicationSchema).parse(page);
            if (apps.length === 0) {
                continue;
            }
            await nango.batchSave(apps.map(toRecord), 'Application');
        }

        await nango.trackDeletesEnd('Application');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
