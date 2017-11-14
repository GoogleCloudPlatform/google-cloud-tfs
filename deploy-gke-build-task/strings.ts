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

export function nanReplicaMessage(replicas: string): string {
  return `Number of Replicas must be a number but was "${replicas}".`;
}

export function negitiveReplicaMessage(replicas: number): string {
  return `Number of Replicas must be positive, but was ${replicas}.`;
}

export function deploymentImageSuccess(image: string): string {
  return `Deployment image set to ${image}.`;
}

export function rescaledDryRun(deploymentName: string,
                               replicas: number): string {
  if (replicas > 1 || replicas === 0) {
    return `Deployment ${deploymentName} rescaled to ` +
           `${replicas} replicas. (dry run)`;
  } else {
    return `Deployment ${deploymentName} rescaled to ` +
           `${replicas} replica. (dry run)`;
  }
}

export function imageSetDryRun(deploymentName: string, image: string): string {
  return `Deployment ${deploymentName} image set to ${image}. (dry run)`;
}

export function skipRescale(deploymentName: string, replicas: number): string {
  if (replicas > 1 || replicas === 0) {
    return `Deployment ${deploymentName} has ${replicas} replicas.` +
           ' Skipping rescaling.';
  } else {
    return `Deployment ${deploymentName} has ${replicas} replica.` +
           ' Skipping rescaling.';
  }
}

export function configParseError(path: string): string {
  return `Config file at ${path} is neither a JSON nor a YAML file.`;
}

export function configFileInvalid(path: string): string {
  return `Config file at ${path} is not a valid config.`;
}

export function configApplied(configPath: string): string {
  return `Applied config ${configPath}.`;
}

export function deploymentCreated(deploymentName: string): string {
  return `Deployment ${deploymentName} created.`;
}

export function skipSetImage(deploymentName: string, image: string): string {
  return `Deployment ${deploymentName} already uses image ${image}.`;
}
