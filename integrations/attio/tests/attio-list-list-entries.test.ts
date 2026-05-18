import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-list-entries.js';

describe('attio list-list-entries tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-list-entries',
        Model: 'ActionOutput_attio_listlistentries'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
