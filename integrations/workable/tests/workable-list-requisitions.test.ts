import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-requisitions.js';

describe('workable list-requisitions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-requisitions',
        Model: 'ActionOutput_workable_listrequisitions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
