import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-product.js';

describe('pennylane create-product tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-product',
        Model: 'ActionOutput_pennylane_createproduct'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
