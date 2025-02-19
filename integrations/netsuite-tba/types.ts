import { workerData } from 'worker_threads';
import { lineItemDefaultPropertiesSchema } from '../hubspot/schema.zod';

export interface NSAPI_GetResponse<T> {
    data: T;
}

export interface NS_Address {
    addr1?: string;
    addr2?: string;
    city?: string;
    zip?: string;
    country?: { id: string };
    state?: { id: string };
}

export interface NS_Customer {
    id: string;
    externalId?: string;
    companyName: string;
    email?: string;
    defaultTaxReg?: string;
    phone?: string;
    addressBook: {
        items: {
            addressBookAddress: NS_Address;
        }[];
    };
}

export interface NS_Item {
    item?: {
        id: string;
        refName: string;
    };
    location?: {
        id: string;
        refName: string;
    };
    quantity?: number;
    amount?: number;
    taxDetailsReference?: string;
}

export interface NS_Invoice {
    id: string;
    entity?: {
        id: string;
        name?: string;
    };
    currency?: {
        id?: string;
        refName?: string;
    };
    memo?: string;
    tranDate?: string;
    total?: string;
    status?: {
        id: string;
        refName?: string;
    };
    item: {
        items: NS_Item[];
    };
}

export interface NS_CreditNote {
    id: string;
    entity?: {
        id: string;
    };
    currency?: {
        id?: string;
        refName?: string;
    };
    memo?: string;
    tranDate?: string;
    total?: string;
    status?: {
        id: string;
        refName?: string;
    };
    item: {
        items: NS_Item[];
    };
}

export interface NS_Payment {
    id: string;
    memo?: string;
    customer?: {
        id: string;
    };
    payment?: number;
    tranDate?: string;
    currency?: {
        id?: string;
        refName?: string;
    };
    tranId?: string;
    status?: {
        id: string;
        refName?: string;
    };
    apply?: {
        items: { doc: { id: string } }[];
    };
}

export interface NS_Location {
    links: NS_Link[];
    classTranslation: NS_ClassTranslation;
    id: string;
    includeInControlTower: boolean;
    includeInSupplyPlanning: boolean;
    inventoryBalance: NS_InventoryBalance;
    isInactive: boolean;
    lastModifiedDate: string;
    mainAddress: NS_Location_Address;
    makeInventoryAvailable: boolean;
    makeInventoryAvailableStore: boolean;
    name: string;
    returnAddress: NS_ReturnAddress;
    subsidiary: NS_Subsidiary;
    timeZone: NS_Reference;
    useBins: boolean;
}

interface NS_Link {
    rel: string;
    href: string;
}

interface NS_ClassTranslation {
    links: NS_Link[];
    items: any[];
    totalResults: number;
}

interface NS_InventoryBalance {
    links: NS_Link[];
    items: any[];
    totalResults: number;
}

interface NS_Location_Address {
    links: NS_Link[];
    addr1: string;
    addressee: string;
    addrText: string;
    city: string;
    country: NS_Country;
    override: boolean;
    state: string;
    zip: string;
}

interface NS_Country {
    id: string;
    refName: string;
}

interface NS_ReturnAddress {
    links: NS_Link[];
    addrText: string;
    country: NS_Country;
    override: boolean;
}

interface NS_Subsidiary {
    links: NS_Link[];
    count: number;
    hasMore: boolean;
    items: NS_SubsidiaryItem[];
    offset: number;
    totalResults: number;
}

interface NS_SubsidiaryItem {
    links: NS_Link[];
    id: string;
    refName: string;
}

export interface NS_Reference {
    id: string;
    refName: string;
}

export interface NS_JournalLine {
    line: number;
    account: NS_Reference;
    cleared: boolean;
    credit?: number;
    debit?: number;
    memo?: string;
    department?: NS_Reference;
    location?: NS_Reference;
}

export interface NS_JournalEntry {
    id: string;
    tranDate: string;
    tranId?: string;
    void: boolean;
    approved: boolean;
    createdDate: string;
    lastModifiedDate: string;
    isReversal: boolean;
    reversalDefer: boolean;
    exchangeRate: number;
    currency: NS_Reference;
    subsidiary: NS_Reference;
    customForm: NS_Reference;
    postingPeriod: NS_Reference;
    line: {
        items: NS_JournalLine[];
        totalResults?: number;
    };
}

// PurchaseOrder
export interface NS_PurchaseOrderLine {
    account?: NS_Reference;
    amount?: number;
    assembly?: NS_Reference;
    assemblyUnits?: string;
    billOfMaterials?: NS_Reference;
    billOfMaterialsRevision?: NS_Reference;
    class?: NS_Reference;
    createOutsourcedWo?: boolean;
    createdFrom?: NS_Reference;
    customer?: NS_Reference;
    department?: NS_Reference;
    description?: string;
    inventoryDetail?: NS_InventoryDetail;
    isBillable?: boolean;
    isClosed?: boolean;
    item?: NS_Reference;
    itemSubtype?: NS_Reference;
    itemType?: NS_Reference;
    line?: number;
    location?: NS_Reference;
    matchBillToReceipt?: boolean;
    quantity?: number;
    quantityBilled?: number;
    quantityReceived?: number;
    rate?: number;
    taxAmount?: number;
    taxDetailsReference?: string;
    units?: string;
}

interface NS_InventoryDetail {
    customForm?: NS_Reference | undefined;
    inventoryassignment: {
        items: NS_InventoryAssignment[];
    };
    location?: NS_Reference | undefined;
    quantity?: number | undefined;
    unit?: string | undefined;
}

interface NS_InventoryAssignment {
    binNumber?: NS_Reference;
    expirationDate?: string;
    quantity?: number;
    receiptInventoryNumber?: string;
    toBinNumber?: NS_Reference;
}

export interface NS_PurchaseOrder {
    id?: string;
    accountingBookDetail?: {
        accountingBook?: {
            id: string;
            refName?: string;
        };
        exchangeRate?: number;
    }[];
    approvalStatus?: {
        id: string;
        refName?: string;
    };
    availableVendorCredit?: number;
    balance?: number;
    billAddress?: {
        addr1?: string;
        addr2?: string;
        addr3?: string;
        addrPhone?: string;
        addrText?: string;
        addressee?: string;
        attention?: string;
        city?: string;
        country?: {
            id: string;
            refName?: string;
        };
        override?: boolean;
        state?: string;
        zip?: string;
    };
    class?: {
        id: string;
        refName?: string;
    };
    createdDate?: string;
    createdFrom?: {
        id: string;
        refName?: string;
    };
    currency?: {
        id: string;
        refName?: string;
    };
    customForm?: {
        id: string;
        refName?: string;
    };
    department?: {
        id: string;
        refName?: string;
    };
    discountAmount?: number;
    discountDate?: string;
    dueDate?: string;
    email?: string;
    employee?: {
        id: string;
        refName?: string;
    };
    endDate?: string;
    entity?: {
        id: string;
        refName?: string;
    };
    entityTaxRegNum?: string;
    exchangeRate?: number;
    excludefromsupplyplanning?: boolean;
    externalId?: string;
    firmed?: boolean;
    fob?: string;
    incoterm?: {
        id: string;
        refName?: string;
    };
    intercoStatus?: {
        id: string;
        refName?: string;
    };
    intercoTransaction?: {
        id: string;
        refName?: string;
    };
    isCrossSubTransaction?: boolean;
    item?: {
        items: NS_PurchaseOrderLine[];
    };
    lastModifiedDate?: string;
    location?: {
        id: string;
        refName?: string;
    };
    memo?: string;
    message?: string;
    nextApprover?: {
        id: string;
        refName?: string;
    };
    nexus?: {
        id: string;
        refName?: string;
    };
    orderStatus?: {
        id: string;
        refName?: string;
    };
    otherRefNum?: string;
    shipAddress?: {
        addr1?: string;
        addr2?: string;
        addr3?: string;
        addrPhone?: string;
        addrText?: string;
        addressee?: string;
        attention?: string;
        city?: string;
        country?: {
            id: string;
            refName?: string;
        };
        override?: boolean;
        state?: string;
        zip?: string;
    };
    shipDate?: string;
    shipIsResidential?: boolean;
    shipMethod?: {
        id: string;
        refName?: string;
    };
    shipOverride?: boolean;
    shipTo?: {
        id: string;
        refName?: string;
    };
    source?: {
        id: string;
        refName?: string;
    };
    startDate?: string;
    status?: {
        id: string;
        refName?: string;
    };
    subsidiary?: {
        id: string;
        refName?: string;
    };
    subsidiaryTaxRegNum?: string;
    subtotal?: number;
    supervisorApproval?: boolean;
    taxDetails?: {
        taxAmount?: number;
        taxCode?: {
            id: string;
            refName?: string;
        };
        taxRate?: number;
        taxBasis?: number;
    }[];
    taxDetailsOverride?: boolean;
    taxPointDate?: string;
    taxPointDateOverride?: boolean;
    taxRegOverride?: boolean;
    taxTotal?: number;
    terms?: {
        id: string;
        refName?: string;
    };
    toBeEmailed?: boolean;
    toBeFaxed?: boolean;
    toBePrinted?: boolean;
    total?: number;
    totalAfterTaxes?: number;
    trackingNumbers?: string;
    tranDate?: string;
    tranId?: string;
}
////////////////////
// vendor bill
// export interface VendorBill {
//     vendorBill: string;
//     account: string;
//     accountingBookDetail: accountingBookDetail[];
//     appliedRules: appliedRules[];
//     approvalStatus: NS_Reference;
//     availableVendorCredit: number;
//     balance: number;
//     billAddr1: string;
//     billAddr2: string;
//     billAddr3: string;
//     billAddress: string;
//     billAddressList: nsResource;
//     billAddressee: string;
//     billAttention: string;
//     billCity: string;
//     billCountry: NS_Reference;
//     billOverride: string;
//     billPhone: string;
//     billState: string;
//     billZip: string;
//     billingAddress: billingAddress;
//     billingAddress_text: string;
//     class: classification;
//     createdDate: string;
//     creditLimit: number;
//     currency: currency;
//     customForm: NS_Reference;
//     department: department;
//     discountAmount: number;
//     discountDate: string;
//     documentStatus: string;
//     dueDate: string;
//     endDate: string;
//     entity: 'customer' | 'partner' | 'vendor' | 'nsResource' | 'employee' | 'contact';
//     entityTaxRegNum: string;
//     exchangeRate: number;
//     excludeFromGLNumbering: boolean;
//     expense: expense[];
//     externalId: string;
//     id: string;
//     installment: installment[];
//     intercoStatus: NS_Reference;
//     intercoTransaction: nsResource;
//     item: item[];
//     landedCostMethod: NS_Reference;
//     lastModifiedDate: string;
//     links: NS_Link[];
//     location: location;
//     memo: string;
//     nextApprover: employee;
//     nexus: nexus;
//     overrideInstallments: boolean;
//     paymentHold: boolean;
//     postingPeriod: accountingPeriod;
//     prevDate: string;
//     received: boolean;
//     refName: string;
//     startDate: string;
//     status: NS_Reference;
//     subsidiary: subsidiary;
//     subsidiaryTaxRegNum: string;
//     taxDetails: taxDetails[];
//     taxDetailsOverride: boolean;
//     taxPointDate: string;
//     taxPointDateOverride: boolean;
//     taxRegOverride: boolean;
//     taxTotal: number;
//     terms: term;
//     toBePrinted: boolean;
//     total: number;
//     totalAfterTaxes: number;
//     tranDate: string;
//     tranId: string;
//     unbilledOrders: number;
//     userTotal: number;
// }

// export interface accountingBookDetail {
//     items: accountingBookDetailElement;
// }

// export interface accountingBookDetailElement {
//     accountingBook: accountingBook;
//     exchangeRate: number;
//     links: NS_Link[];
//     refName: string;
//     revRecOnRevCommitment: boolean;
//     subsidiary: subsidiary;
//     tranIsVsoeBundle: boolean;
// }

// export interface appliedRules {
//     items: appliedRulesElement;
// }

// export interface appliedRulesElement {
//     creationDate: string;
//     details: string;
//     externalLogId: number;
//     id: number;
//     links: NS_Link[];
//     refName: string;
//     ruleType: string;
//     ruleTypeTranslation: string;
//     transactionVersion: number;
// }

// export interface billingAddress {
//     addr1: string;
//     addr2: string;
//     addr3: string;
//     addrPhone: string;
//     addrText: string;
//     addressee: string;
//     attention: string;
//     city: string;
//     country: NS_Reference;
//     externalId: string;
//     lastModifiedDate: string;
//     links: NS_Link[];
//     override: boolean;
//     refName: string;
//     state: string;
//     zip: string;
// }

// export interface expense {
//     items: expenseElement;
// }

// export interface expenseElement {
//     account: account;
//     amortizStartDate: string;
//     amortizationEndDate: string;
//     amortizationResidual: string;
//     amortizationSched: amortizationSchedule;
//     amortizationType: string;
//     amount: number;
//     category: expenseCategory;
//     class: classification;
//     customer: [customer, partner, vendor, nsResource, employee, contact];
//     department: department;
//     isBillable: boolean;
//     line: number;
//     links: NS_Link[];
//     location: location;
//     memo: string;
//     orderDoc: string;
//     orderLine: string;
//     projecttask: projectTask;
//     refName: string;
//     scheduleType: string;
//     taxAmount: number;
//     taxDetailsReference: string;
// }

// export interface installment {
//     items: installmentElement;
// }

// export interface installmentElement {
//     amount: number;
//     amountDue: number;
//     dueDate: string;
//     links: NS_Link[];
//     refName: string;
//     seqNum: number;
// }

// export interface itemInventoryDetail {
//     customForm: NS_Reference;
//     externalId: string;
//     inventoryassignment: inventoryassignmentElement[];
//     item: [
//         inventoryItem,
//         assemblyItem,
//         kitItem,
//         nsResource,
//         discountItem,
//         markupItem,
//         subtotalItem,
//         descriptionItem,
//         paymentItem,
//         salesTaxItem,
//         taxGroup,
//         shipItem,
//         downloadItem,
//         giftCertificateItem,
//         subscriptionPlan,
//         nonInventorySaleItem,
//         nonInventoryResaleItem,
//         nonInventoryPurchaseItem,
//         serviceSaleItem,
//         serviceResaleItem,
//         servicePurchaseItem,
//         otherChargeSaleItem,
//         otherChargeResaleItem,
//         otherChargePurchaseItem
//     ];
//     itemDescription: string;
//     links: NS_Link[];
//     location: location;
//     quantity: number;
//     refName: string;
//     toLocation: location;
//     unit: string;
// }

// export interface inventoryassignmentElement {
//     binNumber: bin;
//     expirationDate: string;
//     internalId: number;
//     inventoryDetail: number;
//     inventoryStatus: inventoryStatus;
//     issueInventoryNumber: inventoryNumber;
//     links: NS_Link[];
//     packCarton: string;
//     pickCarton: string;
//     quantity: number;
//     quantityAvailable: number;
//     receiptInventoryNumber: string;
//     refName: string;
//     secondaryQuantity: number;
//     toBinNumber: bin;
//     toInventoryStatus: inventoryStatus;
// }

// export interface itemElement {
//     amortizStartDate: string;
//     amortizationEndDate: string;
//     amortizationResidual: string;
//     amortizationSched: amortizationSchedule;
//     amortizationType: string;
//     amount: number;
//     billReceipts: itemReceipt[];
//     billVarianceStatus: NS_Reference;
//     catchUpPeriod: accountingPeriod;
//     class: classification;
//     customer: [customer, partner, vendor, nsResource, employee, contact];
//     deferRevRec: boolean;
//     department: department;
//     description: string;
//     dueToFromSubsidiary: subsidiary;
//     initOqpBucket: string;
//     inventoryDetail: itemInventoryDetail;
//     isBillable: boolean;
//     isCatchWeightItem: boolean;
//     isClosed: boolean;
//     isOpen: boolean;
//     isVsoeBundle: string;
//     item: [inventoryItem, assemblyItem, kitItem, nsResource, discountItem, markupItem, subtotalItem, descriptionItem, paymentItem, salesTaxItem, taxGroup, shipItem, downloadItem, giftCertificateItem, subscriptionPlan, nonInventorySaleItem, nonInventoryResaleItem, nonInventoryPurchaseItem, serviceSaleItem, serviceResaleItem, servicePurchaseItem, otherChargeSaleItem, otherChargeResaleItem, otherChargePurchaseItem];
//     itemSubtype: NS_Reference;
//     itemType: NS_Reference;
//     job: job;
//     landedCostCategory: costCategory;
//     licenseCode: string;
//     line: number;
//     linked: boolean;
//     links: NS_Link[];
//     location: location;
//     marginal: boolean;
//     matrixType: string;
//     minQty: number;
//     options: string;
//     oqpBucket: string;
//     orderDoc: nsResource;
//     orderLine: number;
//     primaryToSecondaryUnitConversionRate: number;
//     printItems: boolean;
//     projecttask: projectTask;
//     quantity: number;
//     rate: number;
//     rateIncludingTax: number;
//     rateSchedule: string;
//     refName: string;
//     scheduleType: string;
//     secondaryQuantity: number;
//     secondaryUnitConversionRate: number;
//     secondaryUnits: string;
//     secondaryUnitsList: string;
//     subsidiary: subsidiary;
//     targetLocation: location;
//     taxAmount: number;
//     taxDetailsReference: string;
//     units: string;
//     vendorName: string;
// }

// export interface taxDetails {
//     items: taxDetailsElement;
// }

// export interface taxDetailsElement {
//     calcDetail: string;
//     lineName: string;
//     lineType: string;
//     links: NS_Link[];
//     netAmount: number;
//     refName: string;
//     taxAmount: number;
//     taxBasis: number;
//     taxCode: salesTaxItem;
//     taxDetailsReference: NS_Reference;
//     taxRate: number;
//     taxType: string;
// }

//////////////////////////
/////////////////////
////////////////

//  Vendor Bill
export interface NS_VendorBillLine {
    // Required fields
    amount?: number;
    item?: {
        id: string;
        refName?: string;
    };
    line?: number;
    description?: string;
    quantity?: number;
    rate?: number;

    // Optional fields
    location?: {
        id: string;
        refName?: string;
    };
    department?: {
        id: string;
        refName?: string;
    };
    class?: {
        id: string;
        refName?: string;
    };
    customer?: {
        id: string;
        refName?: string;
    };
    isBillable?: boolean;
    taxAmount?: number;
    taxDetailsReference?: string;
    amortizStartDate?: string;
    amortizationEndDate?: string;
    amortizationResidual?: string;
    amortizationType?: string;
    amortizationSched?: {
        id: string;
        refName?: string;
    };
    inventoryDetail?: {
        quantity: number;
        binNumber?: {
            id: string;
            refName?: string;
        };
        inventoryStatus?: {
            id: string;
            refName?: string;
        };
        expirationDate?: string;
        receiptInventoryNumber?: string;
    };
}

export interface NS_VendorBill {
    entity: {
        id: string;
        refName?: string;
    };
    tranDate: string; // Transaction
    currency: {
        id: string;
        refName?: string;
    };
    item?: {
        items: NS_VendorBillLine[];
    };
    expense?: {
        items: NS_VendorBillLine[];
    };

    // Optional
    id?: string;
    externalId?: string;
    tranId?: string; // Bill reference no
    memo?: string;
    status?: {
        id: string;
        refName?: string;
    };
    approvalStatus?: {
        id: string;
        refName?: string;
    };
    nextApprover?: {
        id: string;
        refName?: string;
    };
    terms?: {
        id: string;
        refName?: string;
    };
    dueDate?: string;
    exchangeRate?: number;
    discountAmount?: number;
    discountDate?: string;
    total?: number;
    taxTotal?: number;
    userTotal?: number;
    balance?: number;
    totalAfterTaxes?: number;
    availableVendorCredit?: number;
    department?: {
        id: string;
        refName?: string;
    };
    class?: {
        id: string;
        refName?: string;
    };
    location?: {
        id: string;
        refName?: string;
    };
    subsidiary?: {
        id: string;
        refName?: string;
    };
    customForm?: {
        id: string;
        refName?: string;
    };
    billingAddress?: {
        addr1?: string;
        addr2?: string;
        addr3?: string;
        addrPhone?: string;
        addressee?: string;
        attention?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: {
            id: string;
            refName?: string;
        };
        override?: boolean;
    };
    taxDetails?: {
        items: {
            taxCode?: {
                id: string;
                refName?: string;
            };
            taxRate?: number;
            taxAmount?: number;
            taxBasis?: number;
            taxType?: string;
        }[];
    };
    taxDetailsOverride?: boolean;
    taxPointDate?: string;
    taxPointDateOverride?: boolean;
    subsidiaryTaxRegNum?: string;
    entityTaxRegNum?: string;
    paymentHold?: boolean;
    toBePrinted?: boolean;
    received?: boolean;
    excludeFromGLNumbering?: boolean;
}
