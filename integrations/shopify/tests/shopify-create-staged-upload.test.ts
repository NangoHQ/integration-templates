import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-staged-upload.js';

describe('shopify create-staged-upload tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-staged-upload',
        Model: 'ActionOutput_shopify_createstagedupload'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
