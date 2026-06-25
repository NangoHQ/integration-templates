import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-transaction-lines.js';

describe('exact-online list-transaction-lines tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-transaction-lines',
        Model: 'ActionOutput_exact_online_listtransactionlines'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
