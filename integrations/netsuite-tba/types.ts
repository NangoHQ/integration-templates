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

//  Vendor Bill
export interface NS_VendorBillLine {
    // Required
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
export interface FetchFieldsNetsuiteResponse {
    $id?: string;
    $schema?: string;
    title?: string;
    description?: string;
    type?: string | string[];
    properties?: Record<string, FetchFieldsNetsuiteResponse>;
    required?: string[];
    items?: FetchFieldsNetsuiteResponse | FetchFieldsNetsuiteResponse[];
    enum?: any[];
    definitions?: Record<string, FetchFieldsNetsuiteResponse>;
    additionalProperties?: boolean | FetchFieldsNetsuiteResponse;
    default?: any;
}
