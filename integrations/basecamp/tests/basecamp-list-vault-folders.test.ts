import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-vault-folders.js';

describe('basecamp list-vault-folders tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-vault-folders',
        Model: 'ActionOutput_basecamp_listvaultfolders'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('should reject a cursor pointing outside the Basecamp API origin', async () => {
        nangoMock.ActionError = class ActionError extends Error {
            constructor(public payload: Record<string, unknown>) {
                super(payload.message as string);
            }
        };

        const input = await nangoMock.getInput();

        await expect(
            createAction.exec(nangoMock, {
                ...input,
                cursor: 'https://evil.example.com/buckets/48644099/vaults/10239340939/vaults.json?page=2'
            })
        ).rejects.toThrow(/Invalid cursor/);
    });
});
