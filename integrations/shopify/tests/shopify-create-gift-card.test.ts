import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-gift-card.js';

describe('shopify create-gift-card tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-gift-card',
        Model: 'ActionOutput_shopify_creategiftcard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
