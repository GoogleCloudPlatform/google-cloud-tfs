# ![GCP][GCPLogo] Google Cloud Container Build Task

Use [Google Cloud Container Builder][GCB] to build a Docker image and place it in
[Google Container Registry][GCR]

## Usage
![Cloud Build process][Build]

To use this task, first compile your app (unnecessary for Python),
then call the Google Cloud Container Builder task. This task is useful for building
and image to [Google Container Registry][GCR] before deploying that image to
[Google Container Engine][GKE] or [Google App Engine][GAE].

## Parameters

![Cloud Build Parameters][GcbTaskParams]

 - GCP Connection: The service endpoint defining the GCP project to deploy to and
the service account to deploy it with.
 - Image contents directory: The directory containing the contents to be bundled in the image.
 - Cloud build file: The type of cloud build file to use.
   - Select Default ASP.NET Core 1.0 Build to build a standard [ASP.NET Core][AspNetCore] 1.0 app image.
   - Select Existing Dockerfile to use the Dockerfile in the image contents directory.
   - Select Custom Cloud Build to use your own [cloud build configuration file][CloudBuildConfig]. When you do.
 - Selecting Default Build or Existing Dockerfile require the following parameters:
   - Registry Server: The [Google Container Registry][GCR] [hostname][GCRHosts] to push your image to.
   - Repository (Image Name): The name of the image repository (often the name of the image).
   - Image Tag: The tag to give to the image.
 - Selecting Custom Cloud Build needs the following parameters:
   - Cloud Build File: The location of the YAML or JSON file that defines the cloud build.
   - Substitutions: A comma separated list of [custom substitutions][Substitioutions] for your cloud build file. Takes the form `_VAR1=\"val1\",_VAR2=\"val2\"`



[GCPLogo]: ../images/cloud_64x64.png
[Build]: ../images/screenshots/dotnet-core-container-build-process.png
[GcbTaskParams]: ../images/screenshots/container-build-inputs.png
[AspNetCore]: https://www.asp.net/core
[GCB]: https://cloud.google.com/container-builder
[GCR]: https://cloud.google.com/container-registry
[GAE]: https://cloud.google.com/appengine
[GKE]: https://cloud.google.com/container-engine
[GCRHosts]: https://cloud.google.com/container-registry/docs/pushing#pushing_to_the_registry
[CloudBuildConfig]: https://cloud.google.com/container-builder/docs/config
[Substitioutions]: https://cloud.google.com/container-builder/docs/api/build-requests#substitutions
