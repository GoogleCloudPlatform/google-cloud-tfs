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
 * @fileoverview This is the main script run by the container-build-task.
 * @author przybjw@google.com (Jim Przybylinski)
 */
import {Endpoint, getQuietExecOptions} from 'common/exec-options';
import {catchAll} from 'common/handle-rejection';
import * as path from 'path';
import * as task from 'vsts-task-lib/task';
import {IExecOptions} from 'vsts-task-lib/toolrunner';

import * as helper from './container-build-helper';

/**
 * Runs the script for the container-build-task
 */
async function run(): Promise<void> {
  // Check that gcloud exists.
  const gcloudPath = task.which('gcloud', true);

  // Get inputs from GUI.
  // The id of the GCP service endpoint to get the credentials from.
  const endpointId = task.getInput('serviceEndpoint', true);
  // The path of the deployment files.
  const deploymentPath = task.getPathInput('deploymentPath', true);
  // The type of build config to use.
  const buildConfigType = task.getInput('buildConfigType', true);
  const useDefaultConfig = buildConfigType === 'default';
  const useCustomBuild = buildConfigType === 'custom';
  const useDockerfile = buildConfigType === 'docker';
  // The gcr.io registry to push the image to.
  const registry = task.getInput('registry', useDefaultConfig || useDockerfile);
  // The name of the image to build and push.
  const imageName =
      task.getInput('imageName', useDefaultConfig || useDockerfile);
  // The tag of the image to build and push.
  const imageTag = task.getInput('imageTag');
  // The path of the custom cloud config.
  const customCloudBuildFile =
      task.getPathInput('cloudBuildFile', useCustomBuild);
  const customSubstitutions = task.getInput('substitutions');
  const imageOutputVariable = task.getInput('imageVariable');

  const endpoint = new Endpoint(endpointId);

  const dockerfilePath = path.join(deploymentPath, 'Dockerfile');
  if (!useDockerfile && task.exist(dockerfilePath)) {
    task.warning(
        'Dockerfile detected. Remove it to avoid errors, or select "Cloud ' +
        'build file: Existing Dockerfile" to use it to build your image.');
  }

  let cloudBuildFile: string;
  if (useDefaultConfig) {
    cloudBuildFile = path.join(__dirname, 'default', 'cloudbuild.yaml');
  } else if (useCustomBuild) {
    cloudBuildFile = customCloudBuildFile;
  } else {
    cloudBuildFile = '';
  }

  const image = helper.buildFullImageTag(registry, imageName, imageTag);
  const projectArg = endpoint.projectParam;
  const credentialArg = Endpoint.credentialParam;
  const cloudBuildArg = `--config="${cloudBuildFile}"`;
  const tagArg = `--tag="${image}"`;

  let substitutionsArg: string;
  if (useCustomBuild && customSubstitutions) {
    substitutionsArg = `--substitutions=${customSubstitutions}`;
  } else if (useDefaultConfig) {
    const nameAndTag = imageTag ? `${imageName}:${imageTag}` : imageName;
    substitutionsArg =
        `--substitutions=_REG="${registry}",_NAMEANDTAG="${nameAndTag}"`;
  } else {
    substitutionsArg = undefined;
  }

  const gcloud = task.tool(gcloudPath)
                     .line('container builds submit --quiet --format=json')
                     .arg([ projectArg, credentialArg ])
                     .arg(`"${deploymentPath}"`)
                     .argIf(useCustomBuild || useDefaultConfig, cloudBuildArg)
                     .argIf(substitutionsArg, substitutionsArg)
                     .argIf(useDockerfile, tagArg);

  helper.listenToOutput(gcloud);
  if (imageOutputVariable) {
    helper.listenForImages(gcloud, imageOutputVariable);
  }

  const execOptions: IExecOptions = getQuietExecOptions();

  await endpoint.usingAsync(async () => {
    await gcloud.exec(execOptions);
    task.setResult(task.TaskResult.Succeeded, 'Image Built');
  });
}

catchAll(run());
