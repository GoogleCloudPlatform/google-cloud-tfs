# ![GCP][GCPLogo] Deploy to Google Container Engine

This build task lets you configure a [Kubernetes][Kubernetes] cluster on [Google Container Engine][GKE].
Most importantly, it lets you deploy an image from [Google Container Registry][GCR].

## Requirements

A build agent that runs this task must have the [Google Cloud SDK][CloudSdk] installed
with the optional kubectl component. Additionally this task requires a cluster to
already exist. All deployment options require an existing image in [Google Container Registry][GCR].

## Usage

Before running this task, build an image using the [Google Cloud Container Build Task][GCBTask].

There are two main ways to run this task. It can take some values and run/update
a deployment, or it can use configuration file checked into source control.

Common to both methods are three inputs:
 - GCP connection: The service endpoint that defines the GCP Project to connect
to and the service account to connect with.
 - Zone: The primary zone of the cluster to modify.
 - Cluster Name: The name of the cluster to modify.

### Deploy using values

 ![Deploy container by value Parameters][DeployByValueParameters]
 The input parameters for deploying with values are:
 - Deployment Name: The name of the deployment within the cluster to create or update.
 - Image Name: The repository (name) of the image to deploy.
 - Image Tag: The tag of the image to deploy.
 - Number of Replicas: The number of replicas this deployment should contain after
the deploy. This can rescale the deployment bigger or smaller.
 - Dry Run: If checked, this build task will not actually make any changes to the
cluster.

### Deploy using configuration file
 ![Deploy container using configuration file][DeployByConfigParameters]
 The input parameters for deploying using a configuration file are:
 - Config file path: The path in the source repository of the configuration file of the cluster.
 - Update Image Tag: If checked, the build task will modify the configuration file,
updating the given Image Name with a new Image Tag.
 - Image Name: The name of the image to update. All image parameters in the config
file with the same name as this input will be updated.
 - Image Tag: The new tag of the image to set.
 - Dry Run: If checked, this build task will not actually make any changes. Instead,
the new value of the configuration will be output to the build console.


[GCPLogo]: ../images/cloud_64x64.png
[DeployByValueParameters]: ../images/screenshots/deploy-gke-value-inputs.png
[DeployByConfigParameters]: ../images/screenshots/deploy-gke-config-inputs.png
[Kubernetes]: https://kubernetes.io
[GCR]: https://cloud.google.com/container-registry
[GKE]: https://cloud.google.com/container-engine
[CloudSdk]: https://cloud.google.com/sdk/downloads
[GCBTask]: ../container-build-task/README.md
