import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-slos.js';

describe('dynatrace list-slos tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-slos',
        Model: 'ActionOutput_dynatrace_listslos'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
