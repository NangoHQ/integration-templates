import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/tags-add.js';

describe('shopify tags-add tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'tags-add',
        Model: 'ActionOutput_shopify_tagsadd'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
