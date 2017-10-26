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
 * to 'values'.
 * @author przybjw@google.com (Jim Przybylinski)
 */
import {KubeEndpoint} from 'common/exec-options';
import * as task from 'vsts-task-lib/task';
import {TaskResult} from 'vsts-task-lib/task';

import {Deployment} from './interfaces';
import * as s from './strings';

const kubectlPath = task.which('kubectl');

/**
 * Updates a deployment to use a given image and to have a number of replicas.
 * If the deployment does not yet exist, runs the deployment.
 * @param deploymentName The name of the deployment to run or update.
 * @param image The full name and tag of the image to deploy.
 * @param replicas The number of replicas to have in the deployment.
 * @param dryRun If true, will not actually run a deployment.
 * @param jsonKeyFilePath The path to the json key file.
 * @param kubeConfigPath The path to the kubeConfig.json file that defines the
 *   cluster to connect to.
 * @returns An execution promise.
 */
export async function runOrSetDeployment(
    dryRun: boolean, endpoint: KubeEndpoint): Promise<void> {
  const deploymentName = task.getInput('deploymentName', true);
  const imageName = task.getInput('imageName', true);
  const imageTag = task.getInput('imageTag', true);
  const replicas = parseInt(task.getInput('replicas', true), 10);
  if (isNaN(replicas)) {
    throw new Error(s.nanReplicaMessage(task.getInput('replicas')));
  } else if (replicas < 0) {
    throw new Error(s.negitiveReplicaMessage(replicas));
  }
  const image = `${imageName}:${imageTag}`;

  const deployments: Deployment[] = getDeployments(endpoint);
  const deployment: Deployment = deployments.find(
      (dep: Deployment) => dep.metadata.name === deploymentName);
  if (deployment) {
    await setAndResizeDeployment(deployment, image, replicas, dryRun, endpoint);
    task.setResult(TaskResult.Succeeded, s.deploymentImageSuccess(image));
  } else {
    await task.tool(kubectlPath)
        .line('run --port=8080 --record --alsologtostderr')
        .arg(KubeEndpoint.kubeConfigParam)
        .arg(deploymentName)
        .arg(`--image=${image}`)
        .arg(`--replicas=${replicas}`)
        .argIf(dryRun, '--dry-run=true')
        .exec(endpoint.defaultKubectlExecOptions);
    task.setResult(TaskResult.Succeeded, s.deploymentCreated(deploymentName));
  }
}

/**
 * Gets the deployments that currently exist in the cluster.
 * @param kubeConfigPath The path to the kubeConfig.json file that defines the
 *   cluster to get the deployments of.
 * @param jsonKeyFilePath The path to the json key file.
 * @returns An array of Deployments, as parsed from json.
 */
function getDeployments(endpointData: KubeEndpoint): Deployment[] {
  const result = task.tool(kubectlPath)
                     .line('get deployments -o json --alsologtostderr')
                     .arg(KubeEndpoint.kubeConfigParam)
                     .execSync(endpointData.quietKubectlExecOptions);
  if (result.code !== 0) {
    if (result.error) {
      throw result.error;
    } else {
      throw new Error(result.stderr);
    }
  }
  return JSON.parse(result.stdout).items as Deployment[];
}

/**
 * Sets the image of a deployment, and resizes it if necessary.
 * @param deployment The description of the deployment.
 * @param kubeConfigPath The path to the kubeConfig.json file that defines the
 *   cluster we are operating on.
 * @param image The full name and tag of the image to set the deployment to.
 * @param replicas The number of replicas the deployment should have.
 * @param dryRun If true, no changes will actually be made.
 * @param execOptions Execution options for the kubectl tool.
 * @returns An execution promise.
 */
// clang-format off
async function setAndResizeDeployment(
    deployment: Deployment,
    image: string,
    replicas: number,
    dryRun: boolean,
    endpoint: KubeEndpoint
): Promise<void> {
  const imagePromise: Promise<void> =
      setDeploymentImage(deployment, image, dryRun, endpoint);
  const rescalePromise: Promise<void> =
      rescaleDeployment(deployment, replicas, dryRun, endpoint);
  await Promise.all([imagePromise, rescalePromise]);
}

async function rescaleDeployment(
    deployment: Deployment,
    replicas: number,
    dryRun: boolean,
    endpoint: KubeEndpoint
): Promise<void> {
  if (deployment.spec.replicas !== replicas) {
    if (dryRun) {
      console.log(s.rescaledDryRun(deployment.metadata.name, replicas));
    } else {
      await task.tool(kubectlPath)
        .line('scale deployment --alsologtostderr')
        .arg(KubeEndpoint.kubeConfigParam)
        .arg(deployment.metadata.name)
        .arg(`--replicas=${replicas}`)
        .exec(endpoint.defaultKubectlExecOptions);
    }
  } else {
    task.debug(
        s.skipRescale(deployment.metadata.name, replicas));
  }
}
// clang-format on

async function setDeploymentImage(deployment: Deployment, image: string,
                                  dryRun: boolean,
                                  endpoint: KubeEndpoint): Promise<void> {
  const needsNewImage = (container: {image: string}) =>
      container.image !== image;
  if (deployment.spec.template.spec.containers.some(needsNewImage)) {
    if (dryRun) {
      console.log(s.imageSetDryRun(deployment.metadata.name, image));
    } else {
      await task.tool(kubectlPath)
          .line('set image --record --alsologtostderr')
          .arg(KubeEndpoint.kubeConfigParam)
          .arg(`deployment/${deployment.metadata.name}`)
          .arg(`${deployment.metadata.name}=${image}`)
          .exec(endpoint.defaultKubectlExecOptions);
    }
  } else {
    task.debug(s.skipSetImage(deployment.metadata.name, image));
  }
}
