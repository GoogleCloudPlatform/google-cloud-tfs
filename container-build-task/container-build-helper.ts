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
 * @fileoverview Helper functions for container build.
 * @author przybjw@google.com (Jim Przybylinski)
 */
import * as os from 'os';
import * as task from 'vsts-task-lib/task';
import {ToolRunner} from 'vsts-task-lib/toolrunner';

/**
 * Builds the full image tag from parameters.
 * @param registry The registry (host) of the image.
 * @param nameSpace
 *   The namespace of the image. For GCR, this is the project id.
 * @param imageName The repository (name) of the image.
 * @param imageTag The tag of the image, if it has one.
 */
export function buildFullImageTag(registry: string, imageName: string,
                                  imageTag?: string): string {
  if (registry && imageName) {
    const fullImage = `${registry}/$PROJECT_ID/${imageName}`;
    if (imageTag) {
      return fullImage + `:${imageTag}`;
    } else {
      return fullImage;
    }
  } else {
    return null;
  }
}

/**
 * Adds listeners to the gcloud ToolRunner that output stdout and stderr to
 * appropriate console logging levels.
 * @param gcloud The gcloud tool runner.
 */
export function listenToOutput(gcloud: ToolRunner): void {
  gcloud.on('stdline', (line: string) => { task.debug(line); });
  gcloud.on('errline', (line: string) => { console.log(line); });
}

/**
 * Adds a listener to the gcloud ToolRunner that log stdout until the  start of
 * the JSON output. It will then collect but not log the JSON output, parse it,
 * set the image output variable, and then return to logging stdout.
 * @param gcloud The gcloud tool runner.
 * @param imageOutputVariable The name of the variable to sent to the new image
 *   name.
 */
export function listenForImages(gcloud: ToolRunner,
                                imageOutputVariable: string): void {
  const startListener = (line: string): void => {
    if (line.startsWith('{')) {
      gcloud.removeListener('stdline', startListener);
      if (!tryParseImagesToVariable([ line ], imageOutputVariable)) {
        listenForJson(gcloud, imageOutputVariable, [ line ]);
      }
    }
  };
  gcloud.on('stdline', startListener);
}

/**
 * This will start collecting stdout lines until the end of the json output.
 * It will then parse the full json, set the images to the imageOutputVariable,
 * and set the gcloud ToolRunner to log lines to the console.
 * @param jsonLines The json lines already read. Should be ['{'].
 * @param imageOutputVariable The name of the variable to set the images to.
 * @param gcloud The ToolRunner to log the lines from.
 */
function listenForJson(gcloud: ToolRunner, imageOutputVariable: string,
                       jsonLines: string[]): void {
  const collectJson = (line: string): void => {
    jsonLines.push(line);
    if (tryParseImagesToVariable(jsonLines, imageOutputVariable)) {
      gcloud.removeListener('stdline', collectJson);
    }
  };
  gcloud.on('stdline', collectJson);
}

/**
 * Tries to parse the json in the given json lines. If success full, puts the
 * images in the image output variable.
 * @param jsonLines The array of lines that could be a json object.
 * @param imageOutputVariable The name of the variable to set the images to.
 */
function tryParseImagesToVariable(jsonLines: string[],
                                  imageOutputVariable: string): boolean {
  const jsonString = jsonLines.join(os.EOL);
  let images: {};
  try {
    images = JSON.parse(jsonString)['images'];
  } catch (jsonParseError) {
    // Have not reached end of json input.
    return false;
  }
  if (images && images instanceof Array && images.length > 0) {
    task.setVariable(imageOutputVariable, images.join(' '));
  } else {
    task.warning('No output images found!');
  }
  return true;
}
