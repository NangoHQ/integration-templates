import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-marketing-emails.js';

describe('hubspot-knnj list-marketing-emails tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-marketing-emails',
        Model: 'ActionOutput_hubspot_knnj_listmarketingemails'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
