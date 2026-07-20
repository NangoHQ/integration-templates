import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-athlete-routes.js';

describe('strava-web list-athlete-routes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-athlete-routes',
        Model: 'ActionOutput_strava_web_listathleteroutes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
