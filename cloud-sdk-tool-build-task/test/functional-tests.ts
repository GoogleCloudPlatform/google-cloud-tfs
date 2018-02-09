// Copyright 2017 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as assert from 'assert';
import {TaskResult} from 'common/task-result';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('functional tests', function(): void {
  this.timeout(0);

  const agentTempDir = path.join(process.env['TEMP'], 'TfsTemp');
  const agentToolsDir = path.join(process.env['TEMP'], 'TfsTools');
  const cloudSdkToolDir = path.join(agentToolsDir, 'google-cloud-sdk');

  let taskOutput: TaskResult;
  let env: {[variableName: string]: string};

  beforeEach(async () => {
    const tempDirPromise =
        fs.remove(agentTempDir)
            .then(() => fs.readdir(path.dirname(agentTempDir)))
            .then(() => fs.mkdir(agentTempDir));
    const toolsDirPromise =
        fs.remove(agentToolsDir)
            .then(() => fs.readdir(path.dirname(agentToolsDir)))
            .then(() => fs.mkdir(agentToolsDir));
    taskOutput = undefined;
    env = {
      ['INPUT_allowReporting'] : 'false',
      ['Agent_Version'] : '2.115.0',
      ['Agent_TempDirectory'] : agentTempDir,
      ['Agent_ToolsDirectory'] : agentToolsDir,
    };
    await tempDirPromise;
    await toolsDirPromise;
  });

  afterEach('write task output on failure', async function(): Promise<void> {
    if (this.currentTest.state === 'failed' && taskOutput) {
      taskOutput.logData();
    }
  });

  it('installs latest version', async () => {
    taskOutput = await TaskResult.runTask('cloud-sdk-tool.js', env);

    assert.equal(taskOutput.getStatus()[0], 'succeeded');
    const sdkVersions = await fs.readdir(cloudSdkToolDir);
    assert.equal(sdkVersions.length, 1);
    assert(Number(sdkVersions[0].split('.')[0]) > 182);
  });

  it('updates specific cached version', async () => {
    const targetVersion = '176.0.0';
    env['INPUT_version'] = targetVersion;
    await TaskResult.runTask('cloud-sdk-tool.js', env);

    taskOutput = await TaskResult.runTask('cloud-sdk-tool.js', env);

    assert.equal(taskOutput.getStatus()[0], 'succeeded');
    assert(await fs.exists(cloudSdkToolDir));
    const sdkVersions = await fs.readdir(cloudSdkToolDir);
    assert.equal(sdkVersions.length, 1);
    assert.equal(sdkVersions[0], targetVersion);
    assert.equal(taskOutput.getDebugLines('Initializing cached version').length,
                 1);
  });

  it('fails to install invalid version', async () => {
    const targetVersion = 'NotAVersion';
    env['INPUT_version'] = targetVersion;

    taskOutput = await TaskResult.runTask('cloud-sdk-tool.js', env);

    assert.equal(taskOutput.getStatus()[0], 'failed');
  });
});
