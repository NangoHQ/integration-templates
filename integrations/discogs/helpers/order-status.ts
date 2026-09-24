import { z } from 'zod';

// https://www.discogs.com/developers#page:marketplace,header-marketplace-order-post
export const OrderStatusSchema = z.enum([
    'New Order',
    'Buyer Contacted',
    'Invoice Sent',
    'Payment Pending',
    'Payment Received',
    'In Progress',
    'Shipped',
    'Refund Sent',
    'Cancelled (Non-Paying Buyer)',
    'Cancelled (Item Unavailable)',
    "Cancelled (Per Buyer's Request)"
]);
