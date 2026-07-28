import { z } from 'zod';
import { createAction } from 'nango';

const IdReferenceSchema = z.object({
    id: z.number().describe('Resource ID. Example: 123')
});

const InputSchema = z.object({
    id: z.number().describe('Project ID. Example: 210311946'),
    name: z.string().optional().describe('Project name. Example: "Updated Project Name"'),
    description: z.string().nullable().optional().describe('Project description. Example: "Updated description"'),
    number: z.string().nullable().optional().describe('Project number. Auto-generated if null. Example: "P-001"'),
    projectManager: IdReferenceSchema.optional().describe('Project manager employee reference'),
    startDate: z.string().optional().describe('Project start date. Example: "2024-01-01"'),
    endDate: z.string().nullable().optional().describe('Project end date. Example: "2024-12-31"'),
    isInternal: z.boolean().optional().describe('Whether the project is internal'),
    customer: IdReferenceSchema.optional().describe('Customer reference'),
    department: IdReferenceSchema.optional().describe('Department reference'),
    mainProject: IdReferenceSchema.optional().describe('Parent project reference'),
    projectCategory: IdReferenceSchema.optional().describe('Project category reference'),
    reference: z.string().nullable().optional().describe('Reference text'),
    externalAccountsNumber: z.string().nullable().optional().describe('External accounts number'),
    isClosed: z.boolean().optional().describe('Whether the project is closed'),
    isReadyForInvoicing: z.boolean().optional().describe('Whether the project is ready for invoicing'),
    isOffer: z.boolean().optional().describe('Whether this is a project offer'),
    isFixedPrice: z.boolean().optional().describe('Whether the project is fixed price'),
    fixedprice: z.number().nullable().optional().describe('Fixed price amount'),
    currency: IdReferenceSchema.optional().describe('Currency reference'),
    displayNameFormat: z.string().optional().describe('Display name format. Example: "NAME_STANDARD"'),
    invoiceComment: z.string().nullable().optional().describe('Invoice comment'),
    invoiceReceiverEmail: z.string().nullable().optional().describe('Invoice receiver email'),
    overdueNoticeEmail: z.string().nullable().optional().describe('Overdue notice email'),
    invoiceDueDate: z.number().nullable().optional().describe('Invoice due date'),
    invoiceDueDateType: z.string().nullable().optional().describe('Invoice due date type: DAYS, MONTHS, RECURRING_DAY_OF_MONTH'),
    vatType: IdReferenceSchema.optional().describe('VAT type reference'),
    contact: IdReferenceSchema.optional().describe('Customer contact person'),
    attention: IdReferenceSchema.optional().describe('Attention contact'),
    deliveryAddress: IdReferenceSchema.optional().describe('Delivery address reference'),
    markUpOrderLines: z.number().nullable().optional().describe('Markup percentage for order lines'),
    markUpFeesEarned: z.number().nullable().optional().describe('Markup percentage for fees earned'),
    forParticipantsOnly: z.boolean().optional().describe('Restrict to project participants only'),
    generalProjectActivitiesPerProjectOnly: z.boolean().optional().describe('Require general activities to be linked'),
    isPriceCeiling: z.boolean().optional().describe('Whether the project has a price ceiling'),
    priceCeilingAmount: z.number().nullable().optional().describe('Price ceiling amount'),
    useProductNetPrice: z.boolean().optional(),
    ignoreCompanyProductDiscountAgreement: z.boolean().optional()
});

const ProviderEmployeeSchema = z.object({
    id: z.number(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional()
});

const ProviderDepartmentSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const ProviderCustomerSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const ProviderProjectCategorySchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const ProviderCurrencySchema = z.object({
    id: z.number(),
    code: z.string().optional()
});

const ProviderVatTypeSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const ProviderContactSchema = z.object({
    id: z.number(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional()
});

const ProviderAddressSchema = z.object({
    id: z.number(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional()
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    name: z.string().optional(),
    number: z.string().nullable().optional(),
    displayName: z.string().optional(),
    description: z.string().nullable().optional(),
    projectManager: ProviderEmployeeSchema.nullable().optional(),
    department: ProviderDepartmentSchema.nullable().optional(),
    mainProject: z.object({ id: z.number(), name: z.string().optional() }).nullable().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    customer: ProviderCustomerSchema.nullable().optional(),
    isClosed: z.boolean().optional(),
    isReadyForInvoicing: z.boolean().optional(),
    isInternal: z.boolean().optional(),
    isOffer: z.boolean().optional(),
    isFixedPrice: z.boolean().optional(),
    projectCategory: ProviderProjectCategorySchema.nullable().optional(),
    deliveryAddress: ProviderAddressSchema.nullable().optional(),
    displayNameFormat: z.string().nullable().optional(),
    reference: z.string().nullable().optional(),
    externalAccountsNumber: z.string().nullable().optional(),
    vatType: ProviderVatTypeSchema.nullable().optional(),
    fixedprice: z.number().nullable().optional(),
    currency: ProviderCurrencySchema.nullable().optional(),
    markUpOrderLines: z.number().nullable().optional(),
    markUpFeesEarned: z.number().nullable().optional(),
    isPriceCeiling: z.boolean().optional(),
    priceCeilingAmount: z.number().nullable().optional(),
    forParticipantsOnly: z.boolean().optional(),
    generalProjectActivitiesPerProjectOnly: z.boolean().optional(),
    contact: ProviderContactSchema.nullable().optional(),
    attention: ProviderContactSchema.nullable().optional(),
    invoiceComment: z.string().nullable().optional(),
    invoiceReceiverEmail: z.string().nullable().optional(),
    overdueNoticeEmail: z.string().nullable().optional(),
    invoiceDueDate: z.number().nullable().optional(),
    invoiceDueDateType: z.string().nullable().optional(),
    useProductNetPrice: z.boolean().optional(),
    ignoreCompanyProductDiscountAgreement: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    value: ProviderProjectSchema
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    number: z.string().optional(),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isInternal: z.boolean().optional(),
    isClosed: z.boolean().optional(),
    isReadyForInvoicing: z.boolean().optional(),
    isOffer: z.boolean().optional(),
    isFixedPrice: z.boolean().optional(),
    fixedprice: z.number().optional(),
    reference: z.string().optional(),
    externalAccountsNumber: z.string().optional(),
    displayNameFormat: z.string().optional(),
    invoiceComment: z.string().optional(),
    invoiceReceiverEmail: z.string().optional(),
    overdueNoticeEmail: z.string().optional(),
    invoiceDueDate: z.number().optional(),
    invoiceDueDateType: z.string().optional(),
    markUpOrderLines: z.number().optional(),
    markUpFeesEarned: z.number().optional(),
    isPriceCeiling: z.boolean().optional(),
    priceCeilingAmount: z.number().optional(),
    forParticipantsOnly: z.boolean().optional(),
    generalProjectActivitiesPerProjectOnly: z.boolean().optional(),
    useProductNetPrice: z.boolean().optional(),
    ignoreCompanyProductDiscountAgreement: z.boolean().optional(),
    projectManager: z
        .object({
            id: z.number(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional(),
    department: z
        .object({
            id: z.number(),
            name: z.string().optional()
        })
        .optional(),
    customer: z
        .object({
            id: z.number(),
            name: z.string().optional()
        })
        .optional(),
    mainProject: z
        .object({
            id: z.number(),
            name: z.string().optional()
        })
        .optional(),
    projectCategory: z
        .object({
            id: z.number(),
            name: z.string().optional()
        })
        .optional(),
    currency: z
        .object({
            id: z.number(),
            code: z.string().optional()
        })
        .optional(),
    vatType: z
        .object({
            id: z.number(),
            name: z.string().optional()
        })
        .optional(),
    contact: z
        .object({
            id: z.number(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional(),
    attention: z
        .object({
            id: z.number(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional(),
    deliveryAddress: z
        .object({
            id: z.number(),
            addressLine1: z.string().optional(),
            addressLine2: z.string().optional(),
            postalCode: z.string().optional(),
            city: z.string().optional()
        })
        .optional()
});

function normalizeProject(project: z.infer<typeof ProviderProjectSchema>): z.infer<typeof OutputSchema> {
    return {
        id: project.id,
        ...(project.name !== undefined && { name: project.name }),
        ...(project.number !== undefined && project.number !== null && { number: project.number }),
        ...(project.description !== undefined && project.description !== null && { description: project.description }),
        ...(project.startDate !== undefined && project.startDate !== null && { startDate: project.startDate }),
        ...(project.endDate !== undefined && project.endDate !== null && { endDate: project.endDate }),
        ...(project.isInternal !== undefined && { isInternal: project.isInternal }),
        ...(project.isClosed !== undefined && { isClosed: project.isClosed }),
        ...(project.isReadyForInvoicing !== undefined && { isReadyForInvoicing: project.isReadyForInvoicing }),
        ...(project.isOffer !== undefined && { isOffer: project.isOffer }),
        ...(project.isFixedPrice !== undefined && { isFixedPrice: project.isFixedPrice }),
        ...(project.fixedprice !== undefined && project.fixedprice !== null && { fixedprice: project.fixedprice }),
        ...(project.reference !== undefined && project.reference !== null && { reference: project.reference }),
        ...(project.externalAccountsNumber !== undefined &&
            project.externalAccountsNumber !== null && { externalAccountsNumber: project.externalAccountsNumber }),
        ...(project.displayNameFormat !== undefined && project.displayNameFormat !== null && { displayNameFormat: project.displayNameFormat }),
        ...(project.invoiceComment !== undefined && project.invoiceComment !== null && { invoiceComment: project.invoiceComment }),
        ...(project.invoiceReceiverEmail !== undefined && project.invoiceReceiverEmail !== null && { invoiceReceiverEmail: project.invoiceReceiverEmail }),
        ...(project.overdueNoticeEmail !== undefined && project.overdueNoticeEmail !== null && { overdueNoticeEmail: project.overdueNoticeEmail }),
        ...(project.invoiceDueDate !== undefined && project.invoiceDueDate !== null && { invoiceDueDate: project.invoiceDueDate }),
        ...(project.invoiceDueDateType !== undefined && project.invoiceDueDateType !== null && { invoiceDueDateType: project.invoiceDueDateType }),
        ...(project.markUpOrderLines !== undefined && project.markUpOrderLines !== null && { markUpOrderLines: project.markUpOrderLines }),
        ...(project.markUpFeesEarned !== undefined && project.markUpFeesEarned !== null && { markUpFeesEarned: project.markUpFeesEarned }),
        ...(project.isPriceCeiling !== undefined && { isPriceCeiling: project.isPriceCeiling }),
        ...(project.priceCeilingAmount !== undefined && project.priceCeilingAmount !== null && { priceCeilingAmount: project.priceCeilingAmount }),
        ...(project.forParticipantsOnly !== undefined && { forParticipantsOnly: project.forParticipantsOnly }),
        ...(project.generalProjectActivitiesPerProjectOnly !== undefined && {
            generalProjectActivitiesPerProjectOnly: project.generalProjectActivitiesPerProjectOnly
        }),
        ...(project.useProductNetPrice !== undefined && { useProductNetPrice: project.useProductNetPrice }),
        ...(project.ignoreCompanyProductDiscountAgreement !== undefined && {
            ignoreCompanyProductDiscountAgreement: project.ignoreCompanyProductDiscountAgreement
        }),
        ...(project.projectManager !== undefined &&
            project.projectManager !== null && {
                projectManager: {
                    id: project.projectManager.id,
                    ...(project.projectManager.firstName !== undefined && { firstName: project.projectManager.firstName }),
                    ...(project.projectManager.lastName !== undefined && { lastName: project.projectManager.lastName }),
                    ...(project.projectManager.displayName !== undefined && { displayName: project.projectManager.displayName })
                }
            }),
        ...(project.department !== undefined &&
            project.department !== null && {
                department: {
                    id: project.department.id,
                    ...(project.department.name !== undefined && { name: project.department.name })
                }
            }),
        ...(project.customer !== undefined &&
            project.customer !== null && {
                customer: {
                    id: project.customer.id,
                    ...(project.customer.name !== undefined && { name: project.customer.name })
                }
            }),
        ...(project.mainProject !== undefined &&
            project.mainProject !== null && {
                mainProject: {
                    id: project.mainProject.id,
                    ...(project.mainProject.name !== undefined && { name: project.mainProject.name })
                }
            }),
        ...(project.projectCategory !== undefined &&
            project.projectCategory !== null && {
                projectCategory: {
                    id: project.projectCategory.id,
                    ...(project.projectCategory.name !== undefined && { name: project.projectCategory.name })
                }
            }),
        ...(project.currency !== undefined &&
            project.currency !== null && {
                currency: {
                    id: project.currency.id,
                    ...(project.currency.code !== undefined && { code: project.currency.code })
                }
            }),
        ...(project.vatType !== undefined &&
            project.vatType !== null && {
                vatType: {
                    id: project.vatType.id,
                    ...(project.vatType.name !== undefined && { name: project.vatType.name })
                }
            }),
        ...(project.contact !== undefined &&
            project.contact !== null && {
                contact: {
                    id: project.contact.id,
                    ...(project.contact.firstName !== undefined && { firstName: project.contact.firstName }),
                    ...(project.contact.lastName !== undefined && { lastName: project.contact.lastName }),
                    ...(project.contact.displayName !== undefined && { displayName: project.contact.displayName })
                }
            }),
        ...(project.attention !== undefined &&
            project.attention !== null && {
                attention: {
                    id: project.attention.id,
                    ...(project.attention.firstName !== undefined && { firstName: project.attention.firstName }),
                    ...(project.attention.lastName !== undefined && { lastName: project.attention.lastName }),
                    ...(project.attention.displayName !== undefined && { displayName: project.attention.displayName })
                }
            }),
        ...(project.deliveryAddress !== undefined &&
            project.deliveryAddress !== null && {
                deliveryAddress: {
                    id: project.deliveryAddress.id,
                    ...(project.deliveryAddress.addressLine1 !== undefined && { addressLine1: project.deliveryAddress.addressLine1 }),
                    ...(project.deliveryAddress.addressLine2 !== undefined && { addressLine2: project.deliveryAddress.addressLine2 }),
                    ...(project.deliveryAddress.postalCode !== undefined && { postalCode: project.deliveryAddress.postalCode }),
                    ...(project.deliveryAddress.city !== undefined && { city: project.deliveryAddress.city })
                }
            })
    };
}

const action = createAction({
    description: 'Update a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.number !== undefined && { number: input.number }),
            ...(input.projectManager !== undefined && { projectManager: input.projectManager }),
            ...(input.startDate !== undefined && { startDate: input.startDate }),
            ...(input.endDate !== undefined && { endDate: input.endDate }),
            ...(input.isInternal !== undefined && { isInternal: input.isInternal }),
            ...(input.customer !== undefined && { customer: input.customer }),
            ...(input.department !== undefined && { department: input.department }),
            ...(input.mainProject !== undefined && { mainProject: input.mainProject }),
            ...(input.projectCategory !== undefined && { projectCategory: input.projectCategory }),
            ...(input.reference !== undefined && { reference: input.reference }),
            ...(input.externalAccountsNumber !== undefined && { externalAccountsNumber: input.externalAccountsNumber }),
            ...(input.isClosed !== undefined && { isClosed: input.isClosed }),
            ...(input.isReadyForInvoicing !== undefined && { isReadyForInvoicing: input.isReadyForInvoicing }),
            ...(input.isOffer !== undefined && { isOffer: input.isOffer }),
            ...(input.isFixedPrice !== undefined && { isFixedPrice: input.isFixedPrice }),
            ...(input.fixedprice !== undefined && { fixedprice: input.fixedprice }),
            ...(input.currency !== undefined && { currency: input.currency }),
            ...(input.displayNameFormat !== undefined && { displayNameFormat: input.displayNameFormat }),
            ...(input.invoiceComment !== undefined && { invoiceComment: input.invoiceComment }),
            ...(input.invoiceReceiverEmail !== undefined && { invoiceReceiverEmail: input.invoiceReceiverEmail }),
            ...(input.overdueNoticeEmail !== undefined && { overdueNoticeEmail: input.overdueNoticeEmail }),
            ...(input.invoiceDueDate !== undefined && { invoiceDueDate: input.invoiceDueDate }),
            ...(input.invoiceDueDateType !== undefined && { invoiceDueDateType: input.invoiceDueDateType }),
            ...(input.vatType !== undefined && { vatType: input.vatType }),
            ...(input.contact !== undefined && { contact: input.contact }),
            ...(input.attention !== undefined && { attention: input.attention }),
            ...(input.deliveryAddress !== undefined && { deliveryAddress: input.deliveryAddress }),
            ...(input.markUpOrderLines !== undefined && { markUpOrderLines: input.markUpOrderLines }),
            ...(input.markUpFeesEarned !== undefined && { markUpFeesEarned: input.markUpFeesEarned }),
            ...(input.forParticipantsOnly !== undefined && { forParticipantsOnly: input.forParticipantsOnly }),
            ...(input.generalProjectActivitiesPerProjectOnly !== undefined && {
                generalProjectActivitiesPerProjectOnly: input.generalProjectActivitiesPerProjectOnly
            }),
            ...(input.isPriceCeiling !== undefined && { isPriceCeiling: input.isPriceCeiling }),
            ...(input.priceCeilingAmount !== undefined && { priceCeilingAmount: input.priceCeilingAmount }),
            ...(input.useProductNetPrice !== undefined && { useProductNetPrice: input.useProductNetPrice }),
            ...(input.ignoreCompanyProductDiscountAgreement !== undefined && {
                ignoreCompanyProductDiscountAgreement: input.ignoreCompanyProductDiscountAgreement
            })
        };

        const response = await nango.put({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: `v2/project/${encodeURIComponent(input.id)}`,
            data: payload,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const project = parsed.value;

        return normalizeProject(project);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
