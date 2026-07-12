import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-product-changes.js';

describe('pennylane list-product-changes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-product-changes',
        Model: 'ActionOutput_pennylane_listproductchanges'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
