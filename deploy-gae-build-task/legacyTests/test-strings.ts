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
 * @fileoverview A set of strings common to tests.
 * @author przybjw@google.com (Jim Przybylinski)
 */
import {mockIsoString} from 'common/register-mocks';
import * as path from 'path';

const jsonKeyFilePath = path.resolve('tempKeyFile.json');
export const deployPath = path.resolve('Test', 'deploy');
export const yaml = 'app.yaml';
const yamlPath = path.join(deployPath, yaml);

export const yamlParam = `"${yamlPath}"`;
export const projectParam = '--project="projectId"';
export const credentialParam =
    `--credential-file-override="${jsonKeyFilePath}"`;
export const versionParam = `--version="${mockIsoString}"`;
