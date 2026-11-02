import { z } from 'zod';
import { createTool } from 'nango';

const VariationSchema = z.object({
    locale: z.string().min(1).describe('Variation locale.'),
    brandId: z.string().nullable().optional().describe('Brand ID; omit or use null for all brands.'),
    bodyHtml: z.string().optional().describe('HTML block content; only for block content unless intentionally empty. Sent as ordinary text, not encoded.'),
    textContent: z.string().optional().describe('Ordinary inline text; only for inline content unless intentionally empty.'),
    intentionallyEmpty: z
        .boolean()
        .optional()
        .describe('True makes the variation blank and ignores supplied content instead of falling back; defaults to false.')
});

const InputSchema = z
    .object({
        name: z.string().min(1).max(255).describe('Workspace-unique display name as ordinary unescaped text.'),
        variations: z.array(VariationSchema).min(1).describe('One variation per locale/brand pair; include the fallback locale for all brands.'),
        contentType: z.enum(['inline', 'block']).describe('Immutable kind of the new content.'),
        defaultLocale: z.string().min(1).describe('Fallback locale with a required all-brands variation.')
    })
    .describe('Input for creating Intercom dynamic content with locale and brand variations.');

const OutputSchema = z
    .object({
        id: z.string().describe('Created dynamic content identifier.'),
        key: z.string().describe('Immutable article-reference key generated from the original name.'),
        name: z.string().describe('Stored display name with HTML escaping decoded once.').optional(),
        updatedAt: z.iso.datetime({ offset: true }).describe('Stored modification instant in UTC, when supplied.').optional()
    })
    .describe('Receipt returned once Intercom creates the dynamic content.');

const ProviderDynamicContentSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string().optional(),
    updated_at: z.number().int().optional()
});

const ProviderErrorSchema = z.object({
    errors: z
        .array(
            z.object({
                code: z.string().optional(),
                message: z.string().optional()
            })
        )
        .optional()
});

interface ProviderVariationRequest {
    locale: string;
    brand_id?: string;
    text_content?: string;
    body?: string;
    intentionally_empty: boolean;
}

interface ProviderCreateRequest {
    name: string;
    content_type: 'inline' | 'block';
    default_locale: string;
    variations: ProviderVariationRequest[];
}

const HTML_ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'"
};

/**
 * Decodes HTML entities in a single left-to-right pass so an escaped name such as
 * `A &amp; B` becomes `A & B` while `&amp;amp;` becomes `&amp;` (decoded exactly once).
 */
function decodeHtmlEntitiesOnce(value: string): string {
    return value.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match: string, entity: string) => {
        if (entity.startsWith('#')) {
            const isHex = entity[1] === 'x' || entity[1] === 'X';
            const codePoint = Number.parseInt(isHex ? entity.slice(2) : entity.slice(1), isHex ? 16 : 10);
            if (Number.isNaN(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
                return match;
            }
            return String.fromCodePoint(codePoint);
        }
        const decoded = HTML_ENTITIES[entity];
        return decoded === undefined ? match : decoded;
    });
}

function unixSecondsToIsoUtc(unixSeconds: number): string {
    return new Date(unixSeconds * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function getProviderErrorDetails(error: unknown): { status: number | undefined; data: unknown } {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response: unknown = error.response;
        if (typeof response === 'object' && response !== null) {
            const status = 'status' in response && typeof response.status === 'number' ? response.status : undefined;
            const data = 'data' in response ? response.data : undefined;
            return { status, data };
        }
    }
    return { status: undefined, data: undefined };
}

function getProviderErrorMessages(data: unknown): { codes: string[]; messages: string[] } {
    const parsed = ProviderErrorSchema.safeParse(data);
    const codes: string[] = [];
    const messages: string[] = [];
    if (parsed.success && parsed.data.errors !== undefined) {
        for (const issue of parsed.data.errors) {
            if (issue.code !== undefined) {
                codes.push(issue.code);
            }
            if (issue.message !== undefined) {
                messages.push(issue.message);
            }
        }
    }
    return { codes, messages };
}

/**
 * @tags: [write]
 * @tagReason: Creates a new dynamic content resource in the Intercom workspace; no provider reads are performed.
 * @pitfalls: contentType and the article-reference key are fixed at creation and cannot change later. The name must be unique in the workspace or creation is rejected. Dynamic content must be enabled on the workspace plan, otherwise the call fails with a plan restriction.
 */
const tool = createTool({
    name: 'create-dynamic-content',
    description: 'Create inline or block dynamic content with locale and brand variations and an all-brands fallback locale.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Dynamic content must be enabled. Choose inline or block at creation; it cannot change later. Include an all-brands variation for defaultLocale. Use textContent for inline content or bodyHtml for block content; intentionallyEmpty=true suppresses fallback. Use `get-dynamic-content` to inspect normalized blocks after creation.',
        requiredScopes: ['read_write_dynamic_content'],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const seenPairs = new Set<string>();
        let hasAllBrandsDefaultLocale = false;
        const requestVariations: ProviderVariationRequest[] = [];

        for (const [index, variation] of input.variations.entries()) {
            const brandLabel = variation.brandId === undefined || variation.brandId === null ? 'all brands' : `brand "${variation.brandId}"`;
            const pairKey = JSON.stringify([variation.locale, variation.brandId ?? null]);
            if (seenPairs.has(pairKey)) {
                throw new Error(
                    `invalid_variations: Duplicate variation for locale "${variation.locale}" and ${brandLabel}; each locale can appear only once per brand.`
                );
            }
            seenPairs.add(pairKey);

            if (variation.locale === input.defaultLocale && (variation.brandId === undefined || variation.brandId === null)) {
                hasAllBrandsDefaultLocale = true;
            }

            const intentionallyEmpty = variation.intentionallyEmpty ?? false;
            if (intentionallyEmpty) {
                // An intentionally empty variation ignores any supplied content, so neither content field is sent.
                requestVariations.push({
                    locale: variation.locale,
                    ...(variation.brandId !== undefined && variation.brandId !== null && { brand_id: variation.brandId }),
                    intentionally_empty: true
                });
                continue;
            }

            if (input.contentType === 'inline') {
                if (variation.bodyHtml !== undefined) {
                    throw new Error(
                        `invalid_variations: Variation ${index} (locale "${variation.locale}", ${brandLabel}) sets bodyHtml, but contentType is "inline"; provide textContent instead.`
                    );
                }
                if (variation.textContent === undefined) {
                    throw new Error(
                        `invalid_variations: Variation ${index} (locale "${variation.locale}", ${brandLabel}) requires textContent for inline content; set intentionallyEmpty to true to show nothing instead of falling back.`
                    );
                }
                requestVariations.push({
                    locale: variation.locale,
                    ...(variation.brandId !== undefined && variation.brandId !== null && { brand_id: variation.brandId }),
                    text_content: variation.textContent,
                    intentionally_empty: false
                });
            } else {
                if (variation.textContent !== undefined) {
                    throw new Error(
                        `invalid_variations: Variation ${index} (locale "${variation.locale}", ${brandLabel}) sets textContent, but contentType is "block"; provide bodyHtml instead.`
                    );
                }
                if (variation.bodyHtml === undefined) {
                    throw new Error(
                        `invalid_variations: Variation ${index} (locale "${variation.locale}", ${brandLabel}) requires bodyHtml for block content; set intentionallyEmpty to true to show nothing instead of falling back.`
                    );
                }
                requestVariations.push({
                    locale: variation.locale,
                    ...(variation.brandId !== undefined && variation.brandId !== null && { brand_id: variation.brandId }),
                    body: variation.bodyHtml,
                    intentionally_empty: false
                });
            }
        }

        if (!hasAllBrandsDefaultLocale) {
            throw new Error(
                `invalid_variations: Variations must include an all-brands variation (brandId omitted or null) for the defaultLocale "${input.defaultLocale}".`
            );
        }

        const requestBody: ProviderCreateRequest = {
            name: input.name,
            content_type: input.contentType,
            default_locale: input.defaultLocale,
            variations: requestVariations
        };

        let responseData: unknown;
        // @allowTryCatch: provider error statuses are mapped to the tool's public error codes; unrecognized errors are rethrown unchanged.
        try {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/dynamic-content/createdynamiccontent
            const response = await nango.post({
                endpoint: '/dynamic_contents',
                headers: {
                    'Intercom-Version': '2.17'
                },
                data: requestBody,
                retries: 3
            });
            responseData = response.data;
        } catch (error) {
            const { status, data } = getProviderErrorDetails(error);
            const { codes, messages } = getProviderErrorMessages(data);
            if (status === 403 && codes.includes('api_plan_restricted')) {
                throw new Error('feature_not_enabled: Dynamic content is not enabled for this workspace. Ask the owner to enable dynamic content.');
            }
            if (status === 401 || status === 403) {
                throw new Error(
                    'permission_denied: The connection lacks the read_write_dynamic_content OAuth scope. Ask the owner for read_write_dynamic_content access.'
                );
            }
            if (status === 400 || status === 422) {
                const detail = messages.length > 0 ? ` Intercom reported: ${messages.join('; ')}` : '';
                throw new Error(
                    `invalid_request: Intercom rejected the content, locale, brand, or a duplicate name.${detail} Correct the reported values or choose a unique name after inspecting list-dynamic-content.`
                );
            }
            throw error;
        }

        const created = ProviderDynamicContentSchema.safeParse(responseData);
        if (!created.success) {
            throw new Error(
                'write_result_unknown: The create response could not be mapped and the dynamic content may have been created. Check list-dynamic-content for the name before creating another resource.'
            );
        }

        return {
            id: created.data.id,
            key: created.data.key,
            ...(created.data.name !== undefined && { name: decodeHtmlEntitiesOnce(created.data.name) }),
            ...(created.data.updated_at !== undefined && { updatedAt: unixSecondsToIsoUtc(created.data.updated_at) })
        };
    }
});

export default tool;
