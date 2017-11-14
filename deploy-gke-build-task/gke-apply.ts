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
 * @fileoverview The execution the deploy-gke-image task when deployType is set
 * to 'config'.
 * @author przybjw@google.com (Jim Przybylinski)
 */
import {AggregateError} from 'common/aggregate-error';
import {KubeEndpoint} from 'common/exec-options';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as task from 'vsts-task-lib/task';

import {KubeResource} from './interfaces';
import * as s from './strings';

import TaskResult = task.TaskResult;

/**
 * Deploys to gke based on a configuration file.
 * @param dryRun
 * @param kubeConfigPath
 * @param endpoint
 */
export async function applyConfig(dryRun: boolean,
                                  endpoint: KubeEndpoint): Promise<void> {
  const updateTag = task.getBoolInput('updateTag', true);
  const configPath = task.getInput('configPath', true);
  const imageName = task.getInput('imageName', updateTag);
  const imageTag = task.getInput('imageTag', updateTag);

  if (updateTag) {
    updateConfig(configPath, imageName, imageTag);
  }

  await runKubctlApply(configPath, dryRun, endpoint);
}

/**
 * Updates the kubernetes configuration file, setting the image to the given
 *   label.
 * @param path The path of the kubernetes configuration file to update.
 * @param imageName The name of the image to change the tag of.
 * @param imageTag The new tag of the image.
 */
function updateConfig(path: string, imageName: string, imageTag: string): void {
  let configObject: KubeResource;
  const configContents = fs.readFileSync(path).toString();
  let toStringFunction: (input: KubeResource) => string;
  try {
    configObject = JSON.parse(configContents);
    toStringFunction = JSON.stringify;
  } catch (jsonError) {
    try {
      configObject = yaml.safeLoad(configContents);
      toStringFunction = yaml.safeDump;
    } catch (yamlError) {
      throw new AggregateError(s.configParseError(path),
                               [ jsonError as Error, yamlError as Error ]);
    }
  }
  if (typeof configObject !== 'object') {
    throw new Error(s.configFileInvalid(path));
  }
  replaceAllImage(configObject, imageName, imageTag);
  const newConfigContents: string = toStringFunction(configObject);
  task.writeFile(path, newConfigContents);
}

/**
 * Searches for all 'image' properties, checks if they have the same repository
 * (aka image name), and sets those to the new tag.
 * @param config The config object to set the image properties of.
 * @param imageName The repository (aka image name) to update with a new tag.
 * @param newTag The new tag to set the image to.
 */
function replaceAllImage(config: KubeResource, imageName: string,
                         newTag: string): void {
  const imageFullName = `${imageName}:${newTag}`;
  const imageRegex = RegExp(`^\\s*${imageName}(:\\S+)?\\s*$`);

  function replaceImageInElement(kubeConfig: KubeResource): void {
    if (kubeConfig) {
      const imageElement = kubeConfig['image'];
      if (imageElement && typeof imageElement === 'string' &&
          imageElement.match(imageRegex)) {
        kubeConfig['image'] = imageFullName;
      }

      for (const key of Object.keys(kubeConfig)) {
        const element = kubeConfig[key];
        if (element instanceof Array) {
          for (const arrayElement of element) {
            if (typeof arrayElement === 'object') {
              replaceImageInElement(arrayElement);
            }
          }
        } else if (typeof element === 'object') {
          replaceImageInElement(element);
        }
      }
    }
  }

  replaceImageInElement(config);
}

/**
 * Runs kubectl apply.
 * @param configPath The path to the kubernetes configuration file.
 * @param dryRun If a dry run is being done.
 * @param jsonKeyFilePath The path to the json key file that allows us to
 *   connect.
 * @param kubeConfigPath The path to the kubeConfig.json file defining the
 *   cluster we are updating.
 * @returns An execution promise.
 */
async function runKubctlApply(configPath: string, dryRun: boolean,
                              endpoint: KubeEndpoint): Promise<void> {
  await task.tool(task.which('kubectl'))
      .line('apply -f --alsologtostderr')
      .arg(`"${configPath}"`)
      .arg(KubeEndpoint.kubeConfigParam)
      .argIf(dryRun, '--dry-run=true')
      .exec(endpoint.defaultKubectlExecOptions);
  if (dryRun) {
    console.log(fs.readFileSync(configPath).toString());
  }
  task.setResult(TaskResult.Succeeded, s.configApplied(configPath));
}
