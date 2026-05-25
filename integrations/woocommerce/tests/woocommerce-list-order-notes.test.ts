import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-order-notes.js';

describe('woocommerce list-order-notes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-order-notes',
        Model: 'ActionOutput_woocommerce_listordernotes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
