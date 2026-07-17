import { expect, it, describe } from 'vitest';

import createAction from '../actions/list-accessible-customers.js';

describe('google-ads list-accessible-customers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-accessible-customers',
        Model: 'ActionOutput_google_ads_listaccessiblecustomers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
