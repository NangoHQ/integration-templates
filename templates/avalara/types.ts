export interface AvalaraTransaction {
    id: number;
    code: string;
    companyId: number;
    date: string; // ISO date string
    status: string;
    type: string;
    batchCode: string;
    currencyCode: string;
    exchangeRateCurrencyCode: string;
    customerUsageType: string;
    entityUseCode: string;
    customerVendorCode: string;
    customerCode: string;
    exemptNo: string;
    reconciled: boolean;
    locationCode: string;
    reportingLocationCode: string;
    purchaseOrderNo: string;
    referenceCode: string;
    salespersonCode: string;
    taxOverrideType: string;
    taxOverrideAmount: number;
    taxOverrideReason: string;
    totalAmount: number;
    totalExempt: number;
    totalDiscount: number;
    totalTax: number;
    totalTaxable: number;
    totalTaxCalculated: number;
    adjustmentReason: string;
    adjustmentDescription: string;
    locked: boolean;
    region: string;
    country: string;
    version: number;
    softwareVersion: string;
    originAddressId: number;
    destinationAddressId: number;
    exchangeRateEffectiveDate: string; // ISO date string
    exchangeRate: number;
    description: string;
    email: string;
    businessIdentificationNo: string;
    modifiedDate: string; // ISO date string
    modifiedUserId: number;
    taxDate: string; // ISO date string
    lines: AvalaraLineItem[];
    addresses: Address[];
    locationTypes: LocationType[];
    summary: Summary[];
    apStatusCode: string | null;
    apStatus: string | null;
}

export interface AvalaraLineItem {
    id: number;
    transactionId: number;
    lineNumber: string;
    boundaryOverrideId: number;
    customerUsageType: string;
    entityUseCode: string;
    description: string;
    destinationAddressId: number;
    originAddressId: number;
    discountAmount: number;
    discountTypeId: number;
    exemptAmount: number;
    exemptCertId: number;
    exemptNo: string;
    isItemTaxable: boolean;
    isSSTP: boolean;
    itemCode: string;
    lineAmount: number;
    quantity: number;
    ref1: string;
    ref2: string;
    reportingDate: string; // ISO date string
    revAccount: string;
    sourcing: string;
    tax: number;
    taxableAmount: number;
    taxCalculated: number;
    taxCode: string;
    taxCodeId: number;
    taxDate: string; // ISO date string
    taxEngine: string;
    taxOverrideType: string;
    businessIdentificationNo: string;
    taxOverrideAmount: number;
    taxOverrideReason: string;
    taxIncluded: boolean;
    details: Detail[];
    nonPassthroughDetails: any[];
    lineLocationTypes: LineLocationType[];
    hsCode: string;
    costInsuranceFreight: number;
    vatCode: string;
    vatNumberTypeId: number;
}

interface Detail {
    id: number;
    transactionLineId: number;
    transactionId: number;
    addressId: number;
    country: string;
    region: string;
    countyFIPS: string;
    stateFIPS: string;
    exemptAmount: number;
    exemptReasonId: number;
    exemptRuleId: number;
    inState: boolean;
    jurisCode: string;
    jurisName: string;
    jurisdictionId: number;
    signatureCode: string;
    stateAssignedNo: string;
    jurisType: string;
    jurisdictionType: string;
    nonTaxableAmount: number;
    nonTaxableRuleId: number;
    nonTaxableType: string;
    rate: number;
    rateRuleId: number;
    rateSourceId: number;
    serCode: string;
    sourcing: string;
    tax: number;
    taxableAmount: number;
    taxType: string;
    taxSubTypeId: string;
    taxTypeGroupId: string;
    taxName: string;
    taxAuthorityTypeId: number;
    taxRegionId: number;
    taxCalculated: number;
    taxOverride: number;
    rateType: string;
    rateTypeCode: string;
    taxableUnits: number;
    nonTaxableUnits: number;
    exemptUnits: number;
    unitOfBasis: string;
    isNonPassThru: boolean;
    isFee: boolean;
    reportingTaxableUnits: number;
    reportingNonTaxableUnits: number;
    reportingExemptUnits: number;
    reportingTax: number;
    reportingTaxCalculated: number;
    liabilityType: string;
    chargedTo: string;
}

interface Address {
    id: number;
    transactionId: number;
    boundaryLevel: string;
    line1: string;
    line2: string;
    line3: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    taxRegionId: number;
    latitude: string;
    longitude: string;
}

interface LocationType {
    documentLocationTypeId: number;
    documentId: number;
    documentAddressId: number;
    locationTypeCode: string;
}

interface Summary {
    country: string;
    region: string;
    jurisType: string;
    jurisCode: string;
    jurisName: string;
    taxAuthorityType: number;
    stateAssignedNo: string;
    taxType: string;
    taxSubType: string;
    taxName: string;
    rateType: string;
    taxable: number;
    rate: number;
    tax: number;
    taxCalculated: number;
    nonTaxable: number;
    exemption: number;
}

interface LineLocationType {
    documentLineLocationTypeId: number;
    documentLineId: number;
    documentAddressId: number;
    locationTypeCode: string;
}

interface TransactionLineTaxAmountByTaxTypeModel {
    taxTypeId?: string;
    taxAmount?: number;
}
interface TaxOverrideModel {
    type?: 'None' | 'TaxAmount' | 'Exemption' | 'TaxDate' | 'AccruedTaxAmount' | 'DeriveTaxable' | 'OutOfHarbor' | 'TaxAmountByTaxType' | 'VendorChargedTax';
    taxAmount?: number;
    taxDate?: string;
    reason?: string;
    taxAmountByTaxTypes?: TransactionLineTaxAmountByTaxTypeModel[];
}

interface TransactionLineParameterModel {
    name?: string;
    value?: string;
    unit?: string;
}
interface TransactionLineUserDefinedFieldModel {
    name?: string;
    value?: string;
}
export interface AvalaraLineInputItem {
    number?: string;
    quantity?: number;
    amount: number;
    addresses?: AvalaraAddresses;
    taxCode?: string;
    customerUsageType?: string;
    entityUseCode?: string;
    itemCode?: string;
    exemptionCode?: string;
    discounted?: boolean;
    taxIncluded?: boolean;
    revenueAccount?: string;
    ref1?: string;
    ref2?: string;
    description?: string;
    businessIdentificationNo?: string;
    taxOverride?: TaxOverrideModel;
    parameters?: TransactionLineParameterModel[];
    userDefinedFields?: TransactionLineUserDefinedFieldModel[];
    hsCode?: string;
    merchantSellerId?: number;
    merchantSellerIdentifier?: string;
    marketplaceLiabilityType?: 'Marketplace' | 'Seller';
    originationDocumentId?: string;
    originationSite?: string;
    category?: string;
    summary?: string;
}

interface AddressLocationInfo {
    locationCode?: string;
    line1?: string | undefined;
    line2?: string;
    line3?: string;
    city?: string | undefined;
    region?: string | undefined;
    country?: string | undefined;
    postalCode?: string | undefined;
    latitude?: number;
    longitude?: number;
}

export interface AvalaraAddresses {
    singleLocation?: AddressLocationInfo;
    shipFrom?: AddressLocationInfo;
    shipTo?: AddressLocationInfo;
    pointOfOrderOrigin?: AddressLocationInfo;
    pointOfOrderAcceptance?: AddressLocationInfo;
    goodsPlaceOrServiceRendered?: AddressLocationInfo;
    import?: AddressLocationInfo;
    billTo?: AddressLocationInfo;
}

interface TransactionUserDefinedFieldModel {
    name?: string;
    value?: string;
}
export interface AvalaraTransactionInput {
    code?: string;
    lines: AvalaraLineInputItem[];
    type?:
        | 'SalesOrder'
        | 'SalesInvoice'
        | 'PurchaseOrder'
        | 'PurchaseInvoice'
        | 'ReturnOrder'
        | 'ReturnInvoice'
        | 'InventoryTransferOrder'
        | 'InventoryTransferInvoice'
        | 'ReverseChargeOrder'
        | 'ReverseChargeInvoice'
        | 'CustomsInvoice'
        | 'CustomsOrder'
        | 'InventoryTransferOutboundInvoice'
        | 'InventoryTransferOutboundOrder'
        | 'Any';
    companyCode?: string;
    date: string; // ISO Date string, e.g., "2024-08-19"
    salespersonCode?: string;
    customerCode: string;
    customerUsageType?: string;
    entityUseCode?: string;
    discount?: number;
    purchaseOrderNo?: string;
    exemptionNo?: string;
    addresses: AvalaraAddresses;
    parameters?: TransactionLineParameterModel[];
    userDefinedFields?: TransactionUserDefinedFieldModel[];
    referenceCode?: string;
    reportingLocationCode?: string;
    commit?: boolean;
    batchCode?: string;
    taxOverride?: TaxOverrideModel;
    currencyCode?: string;
    serviceMode?: 'Automatic' | 'Local' | 'Remote';
    exchangeRate?: number;
    exchangeRateEffectiveDate?: string;
    exchangeRateCurrencyCode?: string;
    posLaneCode?: string;
    businessIdentificationNo?: string;
    isSellerImporterOfRecord?: boolean;
    description?: string;
    email?: string;
    debugLevel?: 'Normal' | 'Diagnostic';
    customerSupplierName?: string;
    dataSourceId?: number;
    deliveryTerms?: 'DAP' | 'DDP' | 'FOB' | 'FCA' | 'FAS' | 'EXW' | 'DPU' | 'CPT' | 'CIP' | 'CIF' | 'CFR';
}

export interface AvalaraCompany {
    id: number;
    accountId: number;
    companyCode: string;
    name: string;
    isDefault: boolean;
    isActive: boolean;
    taxpayerIdNumber: string;
    isFein: boolean;
    hasProfile: boolean;
    isReportingEntity: boolean;
    defaultCountry: string;
    baseCurrencyCode: string;
    roundingLevelId: string;
    isTest: boolean;
    taxDependencyLevelId: string;
    inProgress: boolean;
    isDeleted: boolean;
}
