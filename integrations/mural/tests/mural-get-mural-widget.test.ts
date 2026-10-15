import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-mural-widget.js';

describe('mural get-mural-widget tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-mural-widget',
        Model: 'ActionOutput_mural_getmuralwidget'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
