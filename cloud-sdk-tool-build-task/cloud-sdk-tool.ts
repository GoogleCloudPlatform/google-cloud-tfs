// Copyright 2017 Google Inc. All Rights Reserved
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
 * @fileoverview This is the main script run by the cloud-sdk-tool task.
 * @author przybjw@google.com (Jim Przybylinski)
 */
import {catchAll} from 'common/handle-rejection';
import * as task from 'vsts-task-lib';
import * as toolLib from 'vsts-task-tool-lib/tool';
import {CloudSdkPackage} from './cloud-sdk-package';

async function run(): Promise<void> {
  const versionSpec = task.getInput('version', false);
  const allowReporting = task.getBoolInput('allowReporting', true);

  let version: string;
  if (!versionSpec) {
    version = await CloudSdkPackage.queryLatestVersion();
    task.debug(`Latest version ${version} selected.`);
  } else if (toolLib.isExplicitVersion(versionSpec)) {
    version = versionSpec;
    task.debug(`Version ${version} selected.`);
  } else {
    throw new Error('Version, if set, must be an explicit version.');
  }
  const cloudSdkPackage = new CloudSdkPackage(version);
  if (cloudSdkPackage.isCached()) {
    task.debug(`Initializing cached version`);
    await cloudSdkPackage.init(allowReporting);
  } else {
    task.debug(`Aquiring new version`);
    await cloudSdkPackage.aquire(allowReporting);
  }
}

catchAll(run());
