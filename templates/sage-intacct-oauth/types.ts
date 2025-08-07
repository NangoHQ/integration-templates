export interface GeneralLedgerAccountSummary {
    key: string;
    id: string;
    href: string;
}

export interface GeneralLedgerAccount {
    key: string;
    id: string;
    name: string;
    accountType: 'balanceSheet' | 'incomeStatement';
    normalBalance: 'debit' | 'credit';
    closingType: 'closedToAccount' | 'closingAccount' | 'nonClosingAccount';
    closeToGLAccount: {
        id: string | null;
        key: string | null;
        href?: string;
    };
    status: 'active' | 'inactive';
    requireDimensions: {
        department: boolean;
        location: boolean;
        project: boolean;
        customer: boolean;
        vendor: boolean;
        employee: boolean;
        item: boolean;
        class: boolean;
        contract: boolean;
        warehouse: boolean;
        asset?: boolean;
        affiliateEntity?: boolean;
    };
    isTaxable: boolean;
    category: string | null;
    taxCode: string | null;
    mrcCode: string | null;
    alternativeGLAccount: 'none' | 'payablesAccount' | 'receivablesAccount';
    entity?: {
        key: string;
        id: string;
        name: string;
        href: string;
    };
    audit: {
        createdDateTime: string;
        modifiedDateTime: string;
        createdBy: string;
        modifiedBy: string;
    };
    disallowDirectPosting: boolean;
    href: string;
}

export interface GeneralLedgerAccountResponse {
    'ia::result': GeneralLedgerAccount;
    'ia::meta': PaginationResponse;
}

interface PaginationResponse {
    totalCount: number;
    totalSuccess: number;
    totalError: number;
}
