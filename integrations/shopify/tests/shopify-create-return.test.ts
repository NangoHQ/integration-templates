import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-return.js';

describe('shopify create-return tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-return',
        Model: 'ActionOutput_shopify_createreturn'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
