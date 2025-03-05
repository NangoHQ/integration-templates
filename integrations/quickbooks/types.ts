export interface QuickBooksAccount {
    FullyQualifiedName: string;
    domain: string;
    Name: string;
    Classification: string;
    AccountSubType: string;
    CurrencyRef: ReferenceType;
    CurrentBalanceWithSubAccounts: number;
    sparse: boolean;
    MetaData: MetaData;
    AccountType: string;
    CurrentBalance: number;
    Active: boolean;
    Description?: string;
    SyncToken: string;
    Id: string;
    AcctNum?: string;
    SubAccount: boolean;
}

export interface QuickBooksCustomer {
    Id: string;
    SyncToken: string;
    DisplayName: string;
    Title?: string;
    sparse: boolean;
    domain: string;
    GivenName?: string;
    MiddleName?: string;
    Suffix?: string;
    FamilyName?: string;
    PrimaryEmailAddr?: EmailAddress;
    ResaleNum?: string;
    SecondaryTaxIdentifier?: string;
    ARAccountRef?: ReferenceType;
    DefaultTaxCodeRef: ReferenceType;
    PreferredDeliveryMethod: 'Print' | 'Email' | 'None';
    GSTIN?: string;
    SalesTermRef?: ReferenceType;
    CustomerTypeRef?: ReferenceType;
    Fax?: TelephoneNumber;
    FreeFormNumber?: string;
    BusinessNumber?: string;
    BillWithParent: boolean;
    CurrencyRef?: ReferenceType;
    Mobile?: TelephoneNumber;
    Job: boolean;
    BalanceWithJobs: number;
    PrimaryPhone?: TelephoneNumber;
    OpenBalanceDate?: string;
    Taxable: boolean;
    AlternatePhone?: TelephoneNumber;
    MetaData: MetaData;
    ParentRef?: ReferenceType;
    Notes?: string;
    WebAddr?: string;
    URI?: string;
    Active: boolean;
    CompanyName?: string;
    Balance: number;
    ShipAddr?: PhysicalAddress;
    PaymentMethodRef?: ReferenceType;
    IsProject?: boolean;
    Source?: string;
    PrimaryTaxIdentifier?: string;
    GSTRegistrationType?: 'GST_REG_REG' | 'GST_REG_COMP' | 'GST_UNREG' | 'CONSUMER' | 'OVERSEAS' | 'SEZ' | 'DEEMED';
    PrintOnCheckName: string;
    BillAddr?: PhysicalAddress;
    FullyQualifiedName: string;
    Level?: number;
    TaxExemptionReasonId?: number;
}

export interface ReferenceType {
    value: string;
    name?: string;
    type?: string;
}

interface MetaData {
    CreateTime: string;
    LastUpdatedTime: string;
}

interface EmailAddress {
    Address: string;
}

interface TelephoneNumber {
    FreeFormNumber?: string;
}

export type PhysicalAddressCreation = Omit<PhysicalAddress, 'Id'>;

export interface CreateQuickbooksCustomer extends Omit<QuickBooksCustomer, 'BillAddr' | 'ShipAddr'> {
    BillAddr?: PhysicalAddressCreation;
    ShipAddr?: PhysicalAddressCreation;
}

export interface PhysicalAddress {
    Line1?: string;
    Line2?: string;
    Line3?: string;
    Line4?: string;
    Line5?: string;
    City?: string;
    SubDivisionCode?: string;
    PostalCode?: string;
    Country?: string;
    CountrySubDivisionCode?: string;
    Lat?: string;
    Long?: string;
    Id: string;
}

interface LinkedTxn {
    TxnId: string;
    TxnType: string;
    TxnLineId?: string;
}

interface TaxLineDetail {
    TaxRateRef: ReferenceType;
    PercentBased: boolean;
    TaxPercent: number;
    NetAmountTaxable: number;
}

interface TaxLine {
    Amount: number;
    DetailType: string;
    TaxLineDetail: TaxLineDetail;
}

export interface TxnTaxDetail {
    TxnTaxCodeRef?: ReferenceType;
    TotalTax: number;
    TaxLine?: TaxLine[];
}

interface CustomerMemo {
    value: string;
}

interface LinePayment {
    Amount: number;
    LinkedTxn?: LinkedTxn[];
}

interface CreditChargeResponse {
    Status?: string;
    AuthCode?: string;
    TxnAuthorizationTime?: string;
    CCTransId?: string;
}

interface CreditChargeInfo {
    CcExpiryMonth?: number;
    CcExpiryYear?: number;
    NameOnAcct?: string;
    Type?: string;
    BillAddrStreet?: string;
    Amount?: number;
    PostalCode?: string;
    ProcessPayment?: boolean;
}

export interface QuickBooksPayment {
    Id: string;
    domain: string;
    TotalAmt: number;
    CustomerRef: ReferenceType;
    SyncToken: string;
    CurrencyRef?: ReferenceType;
    ProjectRef?: ReferenceType;
    PrivateNote?: string;
    PaymentMethodRef?: ReferenceType;
    UnappliedAmt?: number;
    DepositToAccountRef?: ReferenceType;
    ExchangeRate?: number;
    Line?: LinePayment[];
    TxnSource?: string;
    TxnDate: string;
    CreditCardPayment?: {
        CreditChargeResponse?: CreditChargeResponse;
        CreditChargeInfo?: CreditChargeInfo;
    };
    TransactionLocationType: string;
    Status?: 'Completed' | 'Unknown';
    PaymentRefNum?: string;
    TaxExemptionRef?: ReferenceType;
    MetaData: MetaData;
    status?: string;
}

interface QuickBooksItemGroupLine {
    Qty: number;
    ItemRef: ReferenceType;
}

interface QuickBooksItemGroupDetail {
    ItemGroupLine: QuickBooksItemGroupLine[];
}

export interface QuickBooksItem {
    FullyQualifiedName: string;
    Sku?: string;
    ItemCategoryType?: string;
    domain: string;
    Name: string;
    TrackQtyOnHand: boolean;
    Type: string;
    PurchaseCost: number;
    QtyOnHand?: number;
    InvStartDate?: string;
    Taxable: boolean;
    ExpenseAccountRef?: ReferenceType;
    AssetAccountRef?: ReferenceType;
    IncomeAccountRef?: ReferenceType;
    TaxClassificationRef?: ReferenceType;
    ClassRef?: ReferenceType;
    SalesTaxCodeRef?: ReferenceType;
    SalesTaxIncluded?: boolean;
    ItemGroupDetail?: QuickBooksItemGroupDetail;
    sparse: boolean;
    Active: boolean;
    PrintGroupedItems?: boolean;
    SyncToken: string;
    UnitPrice: number;
    Id: string;
    Description?: string;
    PurchaseDesc?: string;
    UQCDisplayText?: string;
    Source?: string;
    MetaData: MetaData;
}

interface SalesItemLineDetail {
    TaxCodeRef?: ReferenceType;
    Qty?: number;
    UnitPrice?: number;
    DiscountRate?: number;
    ItemRef: ReferenceType;
}

export interface LineInvoice extends CreateLineInvoice {
    Id: string;
    LineNum: number;
}

export interface CreateLineInvoice {
    Description?: string;
    DetailType: string;
    SalesItemLineDetail?: SalesItemLineDetail;
    LinkedTxn?: LinkedTxn[];
    SubTotalLineDetail?: object;
    Amount: number;
}

export interface QuickBooksInvoice {
    AllowIPNPayment: boolean;
    AllowOnlinePayment: boolean;
    AllowOnlineCreditCardPayment: boolean;
    AllowOnlineACHPayment: boolean;
    domain: string;
    sparse: boolean;
    Id: string;
    SyncToken: string;
    MetaData: MetaData;
    CustomField: any[];
    DocNumber: string;
    TxnDate: string;
    CurrencyRef: ReferenceType;
    LinkedTxn: LinkedTxn[];
    Line: LineInvoice[];
    TxnTaxDetail: TxnTaxDetail;
    CustomerRef: ReferenceType;
    CustomerMemo: CustomerMemo;
    BillAddr: PhysicalAddress;
    ShipAddr: PhysicalAddress;
    SalesTermRef: ReferenceType;
    DueDate: string;
    TotalAmt: number;
    ApplyTaxAfterDiscount: boolean;
    PrintStatus: string;
    EmailStatus: string;
    BillEmail: EmailAddress;
    Balance: number;
    PrivateNote?: string;
    ProjectRef?: ReferenceType;
    Deposit?: number;
    status?: string;
}

export interface QuickBooksCreditMemo {
    RemainingCredit: number;
    domain: string;
    sparse: boolean;
    Id: string;
    SyncToken: string;
    MetaData: MetaData;
    CustomField: any[];
    DocNumber: string;
    TxnDate: string;
    CurrencyRef: ReferenceType;
    Line: LineInvoice[];
    TxnTaxDetail: TxnTaxDetail;
    CustomerRef: ReferenceType;
    ProjectRef?: ReferenceType;
    BillAddr: PhysicalAddress;
    ShipAddr?: PhysicalAddress;
    TotalAmt: number;
    ApplyTaxAfterDiscount: boolean;
    PrintStatus: string;
    EmailStatus: string;
    Balance: number;
    status?: string;
}

export interface QuickBooksLedger {
    QueryResponse: {
        JournalEntry: QuickBooksJournalEntry[];
    };
}

export interface QuickBooksJournalEntry {
    Adjustment: boolean;
    domain: string;
    sparse: boolean;
    Id: string;
    SyncToken: string;
    MetaData: {
        CreateTime: string;
        LastUpdatedTime: string;
    };
    TxnDate: string;
    CurrencyRef: {
        value: string;
        name: string;
    };
    PrivateNote: string;
    Line: QuickBooksJournalLine[];
    TxnTaxDetail: Record<string, unknown>;
    status?: string;
}

export interface QuickBooksJournalLine {
    Id: string;
    Description: string;
    Amount: number;
    DetailType: string;
    JournalEntryLineDetail: {
        PostingType: 'Debit' | 'Credit';
        AccountRef: ReferenceType;
        ClassRef?: ReferenceType;
        DepartmentRef?: ReferenceType;
        TaxCodeRef?: ReferenceType;
        Entity?: {
            Type: string;
            EntityRef: ReferenceType;
        };
    };
}

export interface QuickBooksBill {
    SyncToken: string;
    domain: string;
    VendorRef: ReferenceType;
    TxnDate: string;
    TotalAmt: number;
    APAccountRef?: ReferenceType;
    Id: string;
    sparse: boolean;
    Line: QuickBooksBillLine[];
    Balance: number;
    DueDate: string;
    MetaData: MetaData;
    CurrencyRef: ReferenceType;
    SalesTermRef: ReferenceType;
    status?: string;
}

export interface QuickBooksBillLine {
    DetailType: string;
    Amount: number;
    Id: string;
    AccountBasedExpenseLineDetail?: {
        AccountRef: ReferenceType;
        BillableStatus: string;
        TaxCodeRef: ReferenceType;
    };
    ItemBasedExpenseLineDetail?: {
        TaxCodeRef: ReferenceType;
        Qty: number;
        BillableStatus: string;
        UnitPrice: number;
        ItemRef: ReferenceType;
    };
    Description: string;
}
export interface CreateQuickBooksBill {
    VendorRef: ReferenceType;
    Line: CreateQuickBooksBillLine[];
    CurrencyRef: ReferenceType;
}

export interface CreateQuickBooksBillLine {
    DetailType: string;
    Amount: number;
    Id: string;
    AccountBasedExpenseLineDetail?: {
        AccountRef: ReferenceType;
    };
}

export interface QuickBooksBillPayment {
    DocNumber: string;
    SyncToken: string;
    domain: string;
    VendorRef: ReferenceType;
    TxnDate: string;
    TotalAmt: number;
    CurrencyRef: ReferenceType;
    PayType: string;
    PrivateNote: string;
    sparse: boolean;
    CreditCardPayment: {
        CCAccountRef: ReferenceType;
    };
    Line: {
        Amount: number;
        LinkedTxn: LinkedTxn[];
    }[];
    Id: string;
    MetaData: MetaData;
    status?: string;
}

export interface QuickBooksPurchase {
    Id: string;
    domain: string;
    sparse: boolean;
    SyncToken: string;
    MetaData: MetaData;
    TotalAmt: number;
    PrivateNote: string;
    PaymentType: string;
    PrintStatus: string;
    DocNumber: string;
    TxnDate: string;
    Credit: boolean;
    AccountRef: ReferenceType;
    Line: QuickBooksPurchaseLine[];
    CurrencyRef: ReferenceType;
    EntityRef: ReferenceType;
    status?: string;
}

export interface QuickBooksPurchaseLine {
    DetailType: string;
    Amount: number;
    ProjectRef?: ReferenceType;
    Description: string;
    Id: string;
    AccountBasedExpenseLineDetail: {
        TaxCodeRef: ReferenceType;
        AccountRef: ReferenceType;
        BillableStatus: string;
    };
}

export interface QuickBooksTransfer {
    SyncToken: string;
    domain: string;
    TxnDate: string;
    ToAccountRef: ReferenceType;
    Amount: number;
    CurrencyRef: ReferenceType;
    PrivateNote?: string;
    sparse: boolean;
    Id: string;
    FromAccountRef: ReferenceType;
    MetaData: MetaData;
    status?: string;
}

export interface QuickBooksDeposit {
    SyncToken: string;
    domain: string;
    DepositToAccountRef: ReferenceType;
    TxnDate: string;
    CurrencyRef: ReferenceType;
    PrivateNote?: string;
    TotalAmt: number;
    sparse: boolean;
    Line: QuickBooksDepositLine[];
    Id: string;
    MetaData: MetaData;
    status?: string;
}

export interface QuickBooksDepositLine {
    Id: string;
    Amount: number;
    DetailType: string;
    DepositLineDetail: {
        AccountRef: ReferenceType;
    };
}

export interface CDCConfig {
    entity: string;
    lastSyncDate: Date;
}

// PURCHASE ORDER
export interface QuickBooksPurchaseOrder {
    Id?: string;
    APAccountRef?: ReferenceType;
    VendorRef?: ReferenceType;
    Line?: QuickBooksPurchaseOrderLine[];
    SyncToken?: string;
    CurrencyRef?: ReferenceType;
    GlobalTaxCalculation?: 'TaxExcluded' | 'TaxInclusive' | 'NotApplicable';
    TxnDate?: string;
    CustomField?: QuickBooksCustomField[];
    POEmail?: EmailAddress;
    ClassRef?: ReferenceType;
    SalesTermRef?: ReferenceType;
    LinkedTxn?: LinkedTxn[];
    Memo?: string;
    POStatus?: 'Open' | 'Closed';
    TransactionLocationType?: string;
    DueDate?: { date: string };
    MetaData?: MetaData;
    DocNumber?: string;
    PrivateNote?: string;
    ShipMethodRef?: ReferenceType;
    TxnTaxDetail?: TxnTaxDetail;
    ShipTo?: ReferenceType;
    ExchangeRate?: number;
    ShipAddr?: PhysicalAddress;
    VendorAddr?: PhysicalAddress;
    EmailStatus?: string;
    TotalAmt?: number;
    RecurDataRef?: ReferenceType;
    sparse?: boolean;
}

export interface QuickBooksCustomField {
    DefinitionId: string;
    Name?: string;
    Type?: string;
    StringValue?: string;
}

export interface QuickBooksLine {
    Id?: string;
    Amount: number;
    DetailType: 'ItemBasedExpenseLineDetail' | 'AccountBasedExpenseLineDetail';
    AccountBasedExpenseLineDetail?: AccountBasedExpenseLineDetail;
    ItemBasedExpenseLineDetail?: QuickBooksItemBasedExpenseLineDetail;
    Description?: string;
    LineNum?: number;
    LinkedTxn?: LinkedTxn[];
}
export interface QuickBooksPurchaseOrderLine extends Omit<QuickBooksLine, 'DetailType, AccountBasedExpenseLineDetail'> {
    DetailType: 'ItemBasedExpenseLineDetail';
    ProjectRef?: ReferenceType;
}

interface BaseExpenseLineDetail {
    TaxInclusiveAmt?: number;
    CustomerRef?: ReferenceType;
    ClassRef?: ReferenceType;
    TaxCodeRef?: ReferenceType;
    MarkupInfo?: QuickBooksMarkupInfo;
    BillableStatus?: 'Billable' | 'NotBillable' | 'HasBeenBilled';
}

interface AccountBasedExpenseLineDetail extends BaseExpenseLineDetail {
    AccountRef: ReferenceType;
    TaxAmount?: number;
}

export interface QuickBooksItemBasedExpenseLineDetail extends BaseExpenseLineDetail {
    ItemRef?: ReferenceType;
    PriceLevelRef?: ReferenceType;
    Qty?: number;
    UnitPrice?: number;
}

export interface QuickBooksMarkupInfo {
    PriceLevelRef?: ReferenceType;
    Percent?: number;
    MarkUpIncomeAccountRef?: ReferenceType;
}

export interface CreateQuickBooksPurchaseOrder {
    APAccountRef: ReferenceType;
    VendorRef: ReferenceType;
    Line: CreateQuickBooksPurchaseOrderLine[];
    CurrencyRef?: ReferenceType;
}

export interface CreateQuickBooksPurchaseOrderLine {
    Amount: number;
    DetailType: 'ItemBasedExpenseLineDetail';
    ItemBasedExpenseLineDetail: QuickBooksItemBasedExpenseLineDetail;
    Description?: string;
    LineNum?: number;
    LinkedTxn?: LinkedTxn[];
}
