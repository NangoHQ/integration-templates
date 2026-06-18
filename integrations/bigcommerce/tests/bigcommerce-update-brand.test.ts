import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-brand.js';

describe('bigcommerce update-brand tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-brand',
        Model: 'ActionOutput_bigcommerce_updatebrand'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
