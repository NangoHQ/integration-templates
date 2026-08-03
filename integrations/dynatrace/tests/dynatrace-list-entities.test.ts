import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-entities.js';

describe('dynatrace list-entities tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-entities',
        Model: 'ActionOutput_dynatrace_listentities'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
