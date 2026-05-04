import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-transitions.js';

describe('jira list-transitions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-transitions',
        Model: 'ActionOutput_jira_listtransitions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
