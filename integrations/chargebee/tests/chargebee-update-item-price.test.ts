import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-item-price.js';

describe('chargebee update-item-price tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-item-price',
        Model: 'ActionOutput_chargebee_updateitemprice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
