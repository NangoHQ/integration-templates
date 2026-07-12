import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-fiscal-years.js';

describe('pennylane list-fiscal-years tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-fiscal-years',
        Model: 'ActionOutput_pennylane_listfiscalyears'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
