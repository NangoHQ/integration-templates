import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-teams.js';

describe('linear list-teams tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-teams',
        Model: 'ActionOutput_linear_listteams'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
