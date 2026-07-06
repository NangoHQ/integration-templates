import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-campaigns-by-contact.js';

describe('instantly search-campaigns-by-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-campaigns-by-contact',
        Model: 'ActionOutput_instantly_searchcampaignsbycontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
