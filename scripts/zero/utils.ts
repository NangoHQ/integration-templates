export function errorToString(err: unknown) {
    return err instanceof Error ? err.message : String(err);
}
