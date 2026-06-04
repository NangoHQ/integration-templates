import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-company.js';

describe('shopify update-company tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-company',
        Model: 'ActionOutput_shopify_updatecompany'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
