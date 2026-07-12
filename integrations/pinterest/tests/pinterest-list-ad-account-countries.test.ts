import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-ad-account-countries.js';

describe('pinterest list-ad-account-countries tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-ad-account-countries',
        Model: 'ActionOutput_pinterest_listadaccountcountries'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
