import { expect, it, describe } from 'vitest';

import createAction from '../actions/search-records.js';

describe('odoo-api-key search-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-records',
        Model: 'ActionOutput_odoo_api_key_searchrecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
