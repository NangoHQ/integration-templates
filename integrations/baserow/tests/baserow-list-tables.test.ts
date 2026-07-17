import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-tables.js';

describe('baserow list-tables tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-tables',
        Model: 'ActionOutput_baserow_listtables'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
