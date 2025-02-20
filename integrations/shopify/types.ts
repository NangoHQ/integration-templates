export interface ShopifyPaginationParams {
    first: number;
    after: string | null;
    [key: `${string}After`]: string | null;
    [key: `${string}First`]: number;
}

export interface PageInfo {
    hasNextPage: boolean;
    endCursor: string | null;
}

export interface ShopifyResponse {
    data: Record<string, ResponseData<any>>;
    errors?: any;
}

export interface ResponseData<T> {
    edges: { node: T; cursor: string }[]; 
    pageInfo: PageInfo;
}

interface MoneySet {
    presentmentMoney: {
        amount: string;
        currencyCode: string;
    };
}

interface Customer {
    firstName: string;
    lastName: string;
    displayName: string;
    email: string | null;
    phone: string | null;
}

interface Address {
    address1: string;
    address2: string | null;
    city: string;
    country: string;
    province: string | null;
    zip: string | null;
}

export interface LineItem {
    id: string;
    name: string;
    quantity: number;
    originalTotalSet: MoneySet;
    discountedTotalSet: MoneySet;
}

export interface ShopifyOrder {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    processedAt: string;
    currencyCode: string;
    presentmentCurrencyCode: string;
    confirmed: boolean;
    cancelledAt: string | null;
    cancelReason: string | null;
    closed: boolean;
    closedAt: string | null;
    fullyPaid: boolean;
    customer: Customer | null;
    totalReceivedSet: MoneySet;
    subtotalPriceSet: MoneySet;
    totalTaxSet: MoneySet;
    shippingAddress: Address | null;
    billingAddress: Address | null;
    lineItems: LineItem[];
}
