import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-company-attributes.js';

describe('brevo-api-key list-company-attributes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-company-attributes',
        Model: 'ActionOutput_brevo_api_key_listcompanyattributes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
