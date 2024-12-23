export interface Address {
    AddressType: 'STREET' | 'POBOX';
    AddressLine1?: string;
    AddressLine2?: string;
    City: string;
    Region: string;
    PostalCode: string;
    Country: string;
}

export interface Phone {
    PhoneType: 'DEFAULT' | 'DDI' | 'FAX' | 'MOBILE';
    PhoneNumber: string;
    PhoneAreaCode: string;
    PhoneCountryCode: string;
}

export interface Contact {
    ContactID: string;
    ContactStatus: 'ACTIVE' | 'INACTIVE';
    ContactNumber?: string;
    Name: string;
    EmailAddress: string;
    BankAccountDetails: string;
    TaxNumber?: string;
    Addresses: Address[];
    Phones: Phone[];
    UpdatedDateUTC: string;
    ContactGroups: unknown[];
    IsSupplier: boolean;
    IsCustomer: boolean;
    SalesTrackingCategories: string[];
    PurchasesTrackingCategories: string[];
    ContactPersons: unknown[];
    HasValidationErrors: boolean;
    StatusAttributeString: string;
}

interface SlimItem {
    ItemID: string;
    Name: string;
    Code: string;
}

interface Tracking {
    TrackingCategoryID: string;
    Name: string;
    Option: string;
}

export interface LineItem {
    Description: string;
    UnitAmount: string;
    TaxAmount: string;
    LineAmount: string;
    Tracking: Tracking[];
    Quantity: number;
    DiscountRate?: number;
    DiscountEnteredAsPercent?: boolean;
    DiscountAmount?: number;
    ItemCode: string;
    TaxType: string;
    AccountCode: string;
    AccountId: string;
    Item: SlimItem;
    LineItemID: string;
}

interface Account {
    AccountID: string;
    Code: string;
}

export interface Invoice {
    Type: 'ACCREC' | 'ACCPAY';
    Contact: Contact;
    Date: string; // Date in ISO string format
    DueDate: string; // Date in ISO string format
    DateString: string;
    DueDateString: string;
    Status: 'AUTHORISED' | 'DRAFT' | 'PAID';
    Reference: string;
    Url?: string;
    LineAmountTypes: 'Exclusive' | 'Inclusive' | 'NoTax';
    LineItems: LineItem[];
    SubTotal: string;
    TotalTax: string;
    Total: string;
    UpdatedDateUTC: string; // Date in ISO string format
    CurrencyCode: string;
    InvoiceID: string;
    InvoiceNumber: string;
    Payments: Payment[];
    AmountDue: string;
    AmountPaid: string;
    AmountCredited: string;
}

export interface Payment {
    PaymentID: string;
    Date: string; // Date in ISO string format
    BankAmount: number;
    Amount: number;
    CurrencyRate: number;
    PaymentType: 'ACCPAYPAYMENT' | 'ACCRECPAYMENT';
    Status: 'AUTHORISED' | 'PENDING' | 'VOIDED';
    UpdatedDateUTC: string; // Date in ISO string format
    HasAccount: boolean;
    IsReconciled: boolean;
    Account: Account;
    Invoice: Invoice;
    HasValidationErrors: boolean;
    CreditNote?: {
        CreditNoteID: string;
    };
}

interface Warning {
    Message: string;
}

export interface CreditNote {
    CreditNoteID: string;
    CreditNoteNumber: string;
    Payments: any[];
    ID: string;
    HasErrors: boolean;
    CurrencyRate: number;
    Type: string;
    Reference: string;
    RemainingCredit: number;
    Allocations: any[];
    Contact: Contact;
    DateString: string;
    Date: string;
    Status: string;
    LineAmountTypes: string;
    LineItems: LineItem[];
    SubTotal: number;
    TotalTax: number;
    Total: number;
    UpdatedDateUTC: string;
    CurrencyCode: string;
    StatusAttributeString: string;
    Warnings: Warning[];
    ValidationErrors?: string[];
}

export interface Item {
    ItemID: string;
    Code: string;
    UpdatedDateUTC: string; // Consider converting this to a Date object if needed
    PurchaseDetails: Record<string, any>; // Adjust as per the actual structure of PurchaseDetails
    SalesDetails: Record<string, any>; // Adjust as per the actual structure of SalesDetails
    Name?: string;
    Description?: string;
    IsTrackedAsInventory: boolean;
    IsSold: boolean;
    IsPurchased: boolean;
    StatusAttributeString: string;
    ValidationErrors: string[]; // Specify the structure of ValidationErrors if known
}

export interface XeroJournal {
    JournalID: string;
    JournalDate: string;
    JournalNumber: number;
    CreatedDateUTC: string;
    JournalLines: XeroJournalLine[];
}

export interface XeroTrackingCategory {
    Name: string;
    Option: string;
    TrackingCategoryID: string;
    TrackingOptionID: string;
    Options: string[];
}

export interface XeroJournalLine {
    JournalLineID: string;
    AccountID: string;
    AccountCode: string;
    AccountType: string;
    AccountName: string;
    Description?: string;
    NetAmount: number;
    GrossAmount: number;
    TaxAmount: number;
    TaxType?: string;
    TaxName?: string;
    TrackingCategories: XeroTrackingCategory[];
}
