import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-satisfaction-surveys.js';

describe('gorgias list-satisfaction-surveys tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-satisfaction-surveys',
        Model: 'ActionOutput_gorgias_listsatisfactionsurveys'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
