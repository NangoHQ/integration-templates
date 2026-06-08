import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-files.js';

describe('shopify delete-files tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-files',
        Model: 'ActionOutput_shopify_deletefiles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
