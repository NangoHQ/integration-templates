import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-mural-widgets.js';

describe('mural list-mural-widgets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-mural-widgets',
        Model: 'ActionOutput_mural_listmuralwidgets'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
