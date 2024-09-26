export function errorToObject(err: any) {
    if ('response' in err) {
        return err.response.data;
    }
    if (err instanceof Error) {
        return JSON.parse(JSON.stringify(err, ['name', 'message']));
    }
    return err;
}
