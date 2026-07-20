import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-rows.js';

describe('baserow list-rows tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-rows',
        Model: 'ActionOutput_baserow_listrows'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
