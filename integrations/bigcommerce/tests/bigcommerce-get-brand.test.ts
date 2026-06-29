import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-brand.js';

describe('bigcommerce get-brand tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-brand',
        Model: 'ActionOutput_bigcommerce_getbrand'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
