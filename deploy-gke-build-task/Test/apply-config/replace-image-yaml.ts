﻿// Copyright 2017 Google Inc. All Rights Reserved.
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
 * @fileoverview This is a test script for the deploy gke task with
 *   replacing the image tag in a yaml config file.
 * @author przybjw@google.com (Jim Przybylinski)
 */
import * as mocks from 'common/register-mocks';
import * as tc from './test-constants';

const runner = tc.getDefaultRunner();
runner.setInput('configPath', tc.configPath);
runner.setInput('updateTag', 'true');
runner.setInput('imageName', tc.imageName);
runner.setInput('imageTag', tc.imageTag);

const answers = tc.getDefaultAnswers();
answers.exec[tc.kubectlApplyExecString] = tc.successResult;
runner.setAnswers(answers);
mocks.registerCommonMocks(runner, tc.configs.yaml.map);

runner.run();
