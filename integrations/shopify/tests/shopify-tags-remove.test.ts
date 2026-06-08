import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/tags-remove.js';

describe('shopify tags-remove tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'tags-remove',
        Model: 'ActionOutput_shopify_tagsremove'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
