import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-project-components.js';

describe('jira list-project-components tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-project-components',
        Model: 'ActionOutput_jira_listprojectcomponents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
