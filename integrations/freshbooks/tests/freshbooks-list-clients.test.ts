import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-clients.js';

describe('freshbooks list-clients tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-clients',
        Model: 'ActionOutput_freshbooks_listclients'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
