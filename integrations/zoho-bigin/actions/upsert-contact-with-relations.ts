import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        email: z.string().min(1).describe('Email address of the contact. Used as the duplicate-check field for the atomic upsert. Example: "jane.doe@example.com"'),
        accountName: z.string().optional().describe('Name of the company (Bigin Accounts module) to find or create and link to the contact.'),
        productNames: z
            .array(z.string().describe('Name of a product to find or create and link to the contact.'))
            .optional()
            .describe('Names of products to find or create and link to the contact.'),
        firstName: z.string().optional().describe('Contact first name (Bigin First_Name).'),
        lastName: z.string().optional().describe('Contact last name (Bigin Last_Name). Required by Bigin when the email does not match an existing contact.'),
        title: z.string().optional().describe('Contact job title (Bigin Title).'),
        phone: z.string().optional().describe('Contact work phone number (Bigin Phone).'),
        mobile: z.string().optional().describe('Contact mobile phone number (Bigin Mobile).'),
        description: z.string().optional().describe('Free-text description of the contact (Bigin Description).')
    })
    .describe('A contact to upsert by email, plus human-readable company and product names to resolve and link.');

const SearchResponseSchema = z.object({
    data: z.array(z.object({ id: z.string() })).optional()
});

const CreateRecordResponseSchema = z.object({
    data: z
        .array(
            z.object({
                code: z.string(),
                message: z.string().optional(),
                details: z.object({ id: z.string().optional() }).optional()
            })
        )
        .optional()
});

// Per-record error results carry no `action` and a `details` object without an `id`.
const UpsertContactResponseSchema = z.object({
    data: z
        .array(
            z.object({
                code: z.string(),
                message: z.string().optional(),
                action: z.string().optional(),
                details: z.object({ id: z.string().optional() }).optional()
            })
        )
        .optional()
});

const LinkResponseSchema = z.object({
    data: z
        .array(
            z.object({
                code: z.string().optional(),
                status: z.string().optional(),
                message: z.string().optional()
            })
        )
        .optional()
});

const LinkedProductSchema = z.object({
    productId: z.string().describe('Bigin ID of the linked product.'),
    productName: z.string().describe('Name of the linked product.'),
    productCreated: z.boolean().describe('True when the product was created by this call; false when an existing product was reused.')
});

const OutputSchema = z
    .object({
        contactId: z.string().describe('Bigin ID of the upserted contact.'),
        contactAction: z
            .enum(['insert', 'update'])
            .describe('Whether the contact was newly inserted ("insert") or an existing contact was updated ("update").'),
        accountId: z.string().optional().describe('Bigin ID of the company linked to the contact, when accountName was provided.'),
        accountCreated: z.boolean().optional().describe('True when a new company was created for accountName; false when an existing company was reused.'),
        products: z.array(LinkedProductSchema).describe('Products resolved and linked to the contact. Empty when productNames was not provided.')
    })
    .describe('The upserted contact with its resolved company and the products linked to it.');

/**
 * @tags: [read, write]
 * @tagReason: Searches existing companies/products (read) and creates companies/products, upserts the contact, and links products (write).
 * @pitfalls: Company and product names are matched through an eventually-consistent search index (roughly 10-20s lag), so two rapid calls with the same brand-new name can create duplicate companies or products. lastName is required when the email does not yet exist, otherwise the upsert is rejected.
 */
const action = createAction({
    description: 'Composite action that upserts a contact by email, finding or creating its company and products by name and linking them.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.accounts.ALL', 'ZohoBigin.modules.contacts.ALL', 'ZohoBigin.modules.products.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let accountId: string | undefined;
        let accountCreated: boolean | undefined;

        if (input.accountName !== undefined) {
            // https://www.bigin.com/developer/docs/apis/v2/search-records.html
            const accountSearch = await nango.get<unknown>({
                endpoint: '/bigin/v2/Accounts/search',
                params: { criteria: `(Account_Name:equals:${input.accountName})` },
                retries: 3
            });

            if (accountSearch.status === 200) {
                const parsed = SearchResponseSchema.parse(accountSearch.data);
                const existing = parsed.data?.[0];
                if (existing !== undefined) {
                    accountId = existing.id;
                    accountCreated = false;
                }
            }

            if (accountId === undefined) {
                // https://www.bigin.com/developer/docs/apis/v2/insert-records.html
                const accountCreate = await nango.post<unknown>({
                    endpoint: '/bigin/v2/Accounts',
                    data: { data: [{ Account_Name: input.accountName }] },
                    // Creating a company is not idempotent; a retry after a lost response would create a duplicate, so retries is intentionally 0.
                    // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                    retries: 0
                });

                const parsed = CreateRecordResponseSchema.safeParse(accountCreate.data);
                const created = parsed.success ? parsed.data.data?.[0] : undefined;
                const createdId = created?.code === 'SUCCESS' ? created.details?.id : undefined;

                if (createdId === undefined) {
                    throw new nango.ActionError({
                        type: 'account_create_failed',
                        message: created?.message ?? `Failed to create company "${input.accountName}".`,
                        status: accountCreate.status,
                        ...(created?.code !== undefined && { code: created.code })
                    });
                }

                accountId = createdId;
                accountCreated = true;
            }
        }

        const contactPayload: Record<string, unknown> = { Email: input.email };
        if (input.firstName !== undefined) {
            contactPayload['First_Name'] = input.firstName;
        }
        if (input.lastName !== undefined) {
            contactPayload['Last_Name'] = input.lastName;
        }
        if (input.title !== undefined) {
            contactPayload['Title'] = input.title;
        }
        if (input.phone !== undefined) {
            contactPayload['Phone'] = input.phone;
        }
        if (input.mobile !== undefined) {
            contactPayload['Mobile'] = input.mobile;
        }
        if (input.description !== undefined) {
            contactPayload['Description'] = input.description;
        }
        if (accountId !== undefined) {
            contactPayload['Account_Name'] = { id: accountId };
        }

        // https://www.bigin.com/developer/docs/apis/v2/upsert-records.html
        const contactUpsert = await nango.post<unknown>({
            endpoint: '/bigin/v2/Contacts/upsert',
            data: { data: [contactPayload], duplicate_check_fields: ['Email'] },
            // A retry after a lost response would report the first call's insert as an "update" (contactAction).
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const upsertParsed = UpsertContactResponseSchema.safeParse(contactUpsert.data);
        const upserted = upsertParsed.success ? upsertParsed.data.data?.[0] : undefined;
        const contactId = upserted?.code === 'SUCCESS' ? upserted.details?.id : undefined;
        const contactAction = upserted?.action;

        if (contactId === undefined || (contactAction !== 'insert' && contactAction !== 'update')) {
            throw new nango.ActionError({
                type: 'contact_upsert_failed',
                message: upserted?.message ?? `Failed to upsert contact "${input.email}".`,
                status: contactUpsert.status,
                ...(upserted?.code !== undefined && { code: upserted.code })
            });
        }

        const products: z.infer<typeof LinkedProductSchema>[] = [];

        if (input.productNames !== undefined) {
            // Resolve each distinct name once: the search index lags writes, so a repeated name would not see
            // the product created for its first occurrence and would create a duplicate.
            const uniqueProductNames = [...new Set(input.productNames)];
            for (const productName of uniqueProductNames) {
                let productId: string | undefined;
                let productCreated = false;

                // https://www.bigin.com/developer/docs/apis/v2/search-records.html
                const productSearch = await nango.get<unknown>({
                    endpoint: '/bigin/v2/Products/search',
                    params: { criteria: `(Product_Name:equals:${productName})` },
                    retries: 3
                });

                if (productSearch.status === 200) {
                    const parsed = SearchResponseSchema.parse(productSearch.data);
                    const existing = parsed.data?.[0];
                    if (existing !== undefined) {
                        productId = existing.id;
                    }
                }

                if (productId === undefined) {
                    // https://www.bigin.com/developer/docs/apis/v2/insert-records.html
                    const productCreate = await nango.post<unknown>({
                        endpoint: '/bigin/v2/Products',
                        data: { data: [{ Product_Name: productName }] },
                        // Creating a product is not idempotent; a retry after a lost response would create a duplicate, so retries is intentionally 0.
                        // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                        retries: 0
                    });

                    const parsed = CreateRecordResponseSchema.safeParse(productCreate.data);
                    const created = parsed.success ? parsed.data.data?.[0] : undefined;
                    const createdId = created?.code === 'SUCCESS' ? created.details?.id : undefined;

                    if (createdId === undefined) {
                        throw new nango.ActionError({
                            type: 'product_create_failed',
                            message: created?.message ?? `Failed to create product "${productName}".`,
                            status: productCreate.status,
                            ...(created?.code !== undefined && { code: created.code })
                        });
                    }

                    productId = createdId;
                    productCreated = true;
                }

                // https://www.bigin.com/developer/docs/apis/v2/update-related-records.html
                const linkResponse = await nango.put<unknown>({
                    endpoint: `/bigin/v2/Contacts/${encodeURIComponent(contactId)}/Products/${encodeURIComponent(productId)}`,
                    data: { data: [{}] },
                    // Linking is idempotent: re-linking an already-linked product succeeds without creating a duplicate relation.
                    retries: 3
                });

                const linkParsed = LinkResponseSchema.safeParse(linkResponse.data);
                const linkResult = linkParsed.success ? linkParsed.data.data?.[0] : undefined;
                if (linkResult?.status !== 'success' || linkResult.code !== 'SUCCESS') {
                    throw new nango.ActionError({
                        type: 'product_link_failed',
                        message: linkResult?.message ?? `Failed to link product "${productName}" to the contact.`,
                        status: linkResponse.status,
                        ...(linkResult?.code !== undefined && { code: linkResult.code })
                    });
                }

                products.push({ productId, productName, productCreated });
            }
        }

        return {
            contactId,
            contactAction,
            ...(accountId !== undefined && { accountId }),
            ...(accountCreated !== undefined && { accountCreated }),
            products
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
