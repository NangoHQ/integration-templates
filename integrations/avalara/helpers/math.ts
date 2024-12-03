export function div100(amount: number): number {
    return amount / 100;
}

export function div100ToString(amount: number): string {
    return div100(amount).toFixed(2);
}
