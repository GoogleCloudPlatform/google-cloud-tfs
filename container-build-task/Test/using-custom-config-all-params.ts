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

/**
 * @fileoverview This is a test script for the container-build task for a
 *   successful run with custom build config type.
 * @author przybjw@google.com (Jim Przybylinski)
 */
import {getDefaultAnswers, registerCommonMocks} from 'common/register-mocks';
import * as path from 'path';
import {TaskLibAnswers} from 'vsts-task-lib/mock-answer';
import {TaskMockRunner} from 'vsts-task-lib/mock-run';

import {successResult} from './test-constants';

const taskPath = path.join(__dirname, '..', 'container-build.js');
const runner = new TaskMockRunner(taskPath);

const deployPath = path.resolve('deploy');
const inputConfigPath = path.resolve('inputconfig.yaml');

const registry = 'gcr.io';
const imageName = 'image';
const imageTag = 'tag';
const substitutions = `_REG="${registry},_IMG="${imageName}",_TAG="${imageTag}"`;

runner.setInput('serviceEndpoint', 'endpoint');
runner.setInput('deploymentPath', deployPath);
runner.setInput('buildConfigType', 'custom');
runner.setInput('cloudBuildFile', inputConfigPath);
runner.setInput('registry', registry);
runner.setInput('imageName', imageName);
runner.setInput('imageTag', imageTag);
runner.setInput('substitutions', substitutions) ;

const jsonKeyFilePath = path.resolve('tempKeyFile.json');
const execString = [
  '/mocked/tools/gcloud',
  'container builds submit --quiet --format=json',
  '--project=projectId',
  `--credential-file-override="${jsonKeyFilePath}"`,
  `"${deployPath}"`,
  `--config="${inputConfigPath}"`,
  `--substitutions=${substitutions}`
].join(' ');

const answers: TaskLibAnswers = getDefaultAnswers();
answers.exec[execString] = successResult;

runner.setAnswers(answers);
registerCommonMocks(runner);

runner.run();
