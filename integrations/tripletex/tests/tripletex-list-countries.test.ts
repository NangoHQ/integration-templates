import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-countries.js';

describe('tripletex list-countries tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-countries',
        Model: 'ActionOutput_tripletex_listcountries'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
