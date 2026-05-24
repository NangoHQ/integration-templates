import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-time-entries.js';

describe('clickup list-time-entries tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-time-entries',
        Model: 'ActionOutput_clickup_listtimeentries'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
