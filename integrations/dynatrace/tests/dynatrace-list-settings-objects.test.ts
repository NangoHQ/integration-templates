import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-settings-objects.js';

describe('dynatrace list-settings-objects tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-settings-objects',
        Model: 'ActionOutput_dynatrace_listsettingsobjects'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
