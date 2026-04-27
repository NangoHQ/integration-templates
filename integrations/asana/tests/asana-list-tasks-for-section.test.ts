import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-tasks-for-section.js';

describe('asana list-tasks-for-section tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-tasks-for-section',
        Model: 'ActionOutput_asana_listtasksforsection'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
