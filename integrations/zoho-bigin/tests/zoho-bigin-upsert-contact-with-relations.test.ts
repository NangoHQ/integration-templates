import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upsert-contact-with-relations.js';

describe('zoho-bigin upsert-contact-with-relations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upsert-contact-with-relations',
        Model: 'ActionOutput_zoho_bigin_upsertcontactwithrelations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
