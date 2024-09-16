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
