import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-subitems.js';

describe('monday list-subitems tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-subitems',
        Model: 'ActionOutput_monday_listsubitems'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
