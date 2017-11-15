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
 * @fileoverview This is a common module that registers mocks for unit testing
 *   that are common to multiple build tasks.
 * @author JimWP@google.com (Jim Przybylinski)
 */
import * as fs from 'fs';
import {TaskLibAnswers} from 'vsts-task-lib/mock-answer';
import {TaskMockRunner} from 'vsts-task-lib/mock-run';
import {EndpointAuthorization} from 'vsts-task-lib/mock-task';

// clang-format off
export {
  credentialParam,
  jsonKeyFilePath,
  kubeConfigParam,
  kubeConfigPath,
} from './strings';
// clang-format on

/**
 * The ISO string returned by the mocked isoNowString.
 */
export const mockIsoString = '00000000t000000';

const project = 'projectId';
/**
 * The project parameter of any mocked endpoint.
 */
export const projectParam = `--project="${project}"`;

const endpointAuth: EndpointAuthorization = {
  parameters : {certificate : `{"project_id": "${project}"}`},
  scheme : 'Certificate',
};

/**
 * Registers mocks for task.getEndpointAuthorization, task.writeFile,
 * fs.unlinkSync, and fs.readFileSync.
 * @param runner The task runner to register the mocks in.
 * @param files A map from filename to file contents to use in the
 * fs.readFileSync mock.
 */
export function registerCommonMocks(runner: TaskMockRunner,
                                    files?: Map<string, string>): void {
  runner.registerMockExport(
      'getEndpointAuthorization', (id: string): EndpointAuthorization => {
        console.log(`[task.getEndpointAuthorization]${id}`);
        return endpointAuth;
      });

  runner.registerMockExport(
      'writeFile', (file: string, contents?: string): void => {
        console.log(`[task.writeFile]${file}`);
        if (contents) {
          console.log(`[task.writeFile contents]${contents}`);
        }
      });

  runner.registerMock('fs', getFsMock(files));

  runner.registerMock('common/format',
                      {isoNowString() : string { return mockIsoString; }});
}

/**
 * Gets an object that mocks fs, replacing unlinkSync and readFileSync but
 * keeping all other functions the same.
 * @param files A map from filename to file contents. Files in the map will
 * simply have the map content string output. Files not in the map will be read
 * normally.
 */
export function getFsMock(files?: Map<string, string>): typeof fs {
  return Object.create(fs, {
    unlinkSync : {
      value(file: string) : void { console.log(`[fs.unlinkSync]${file}`); },
    },
    readFileSync : {
      value(file: string) : string |
          Buffer {
            if (files && files.has(file)) {
              return files.get(file);
            } else {
              return fs.readFileSync.apply(fs, arguments);
            }
          },
    },
  });
}

/**
 * The path to the mocked gcloud.
 */
export const gcloudPath = '/mocked/tools/gcloud';

/**
 * The path to the mocked kubectl.
 */
export const kubectlPath = '/mocked/tools/kubectl';

/**
 * The gcloud version execution string.
 */
export const gcloudVersionExecString = `${gcloudPath} version --format=json`;

/**
 * @returns {TaskLibAnswers} A set of commonly needed answers.
 */
export function getDefaultAnswers(): TaskLibAnswers {
  return {
    which : {
      'gcloud' : gcloudPath,
      'kubectl' : kubectlPath,
    },
    checkPath : {
      [gcloudPath] : true,
      [kubectlPath] : true,
    },
    exec : {
      [gcloudVersionExecString] : {
        code : 0,
        stdout : JSON.stringify({['Google Cloud SDK']: '174.0.0'}),
      },
    },
  };
}
