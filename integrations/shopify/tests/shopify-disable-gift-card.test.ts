import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/disable-gift-card.js';

describe('shopify disable-gift-card tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'disable-gift-card',
        Model: 'ActionOutput_shopify_disablegiftcard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
