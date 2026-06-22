import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-item-price.js';

describe('chargebee create-item-price tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-item-price',
        Model: 'ActionOutput_chargebee_createitemprice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
