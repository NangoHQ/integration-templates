import { expect, it, describe } from 'vitest';

import createAction from '../actions/link-unlink-company-contacts.js';

describe('brevo-api-key link-unlink-company-contacts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'link-unlink-company-contacts',
        Model: 'ActionOutput_brevo_api_key_linkunlinkcompanycontacts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
