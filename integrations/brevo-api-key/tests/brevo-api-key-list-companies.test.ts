import { expect, it, describe } from 'vitest';

import createAction from '../actions/list-companies.js';

describe('brevo-api-key list-companies tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-companies',
        Model: 'ActionOutput_brevo_api_key_listcompanies'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
