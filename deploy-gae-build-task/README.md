# ![GCP][GCPLogo] Deploy to Google App Engine

This build task deploys apps to [Google App Engine][GAE]. It can deploy apps build for
both the [standard environment][standard] and the [flexible environment][flex]. This means it can deploy
[ASP.NET Core][AspNetCore] apps to the flexible environment.

## Usage

![DotNet Core build process][Build]

![Deploy GAE Task parameters][GaeTaskParams]

To use this task, first compile your app (unnecessary for Python),
then call the Deploy to Google App Engine build task.

### Required Parameters
 - GCP Connection: The service endpoint defining the GCP project to deploy to and
the service account to deploy it with.
 - Deployment source: The directory location of the deployment source.
 - YAML file name: The name of the config file that defines the deployment. Is usually
either **app.yaml** or **`$(Project.Name)`.yaml**.

### Optional Parameters

 - Copy YAML from source folder: If checked, will copy the config YAML file from
a given source folder. Only necessary if the config YAML was not already copied from
the source directory.
   - Source folder: The location to copy the config YAML file from.
 - Staging GCS Bucket: If there is a specific [Google Cloud Storage][GCS] bucket
you wish to use to stage your binaries.
 - Version: The version of the app to be deployed. To use `$(Build.BuildNumber)`, you
have to remove the period (.) from the format. This can be done in the General section
of the Build Definition.
 - Promote: Uncheck this if you don't want your app to start serving live traffic
immediately.
 - Stop Previous Version: If checked, will stop the previous version. This can save
resources, but prevents a quick rollback.


[GCPLogo]: ../images/cloud_64x64.png
[Build]: ../images/screenshots/dotnet-core-build-process.png
[GaeTaskParams]: ../images/screenshots/deploy-gae-inputs.png
[GAE]: https://cloud.google.com/appengine
[standard]: https://cloud.google.com/appengine/docs/standard
[flex]: https://cloud.google.com/appengine/docs/flexible
[GCS]: https://cloud.google.com/storage
[AspNetCore]: https://www.asp.net/core
