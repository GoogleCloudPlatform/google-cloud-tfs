<##
 # Copyright 2017 Google Inc.
 # 
 # Licensed under the Apache License, Version 2.0 (the "License");
 # you may not use this file except in compliance with the License.
 # You may obtain a copy of the License at
 # 
 #     http://www.apache.org/licenses/LICENSE-2.0
 # 
 # Unless required by applicable law or agreed to in writing, software
 # distributed under the License is distributed on an "AS IS" BASIS,
 # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 # See the License for the specific language governing permissions and
 # limitations under the License.
 ##>
[CmdletBinding()]
Param([string[]]$TasksToBuild, [switch]$SkipInit, [switch]$SkipCompile, [switch]$SkipTest)


pushd (Join-Path $MyInvocation.MyCommand.Path ..)
try {
    Import-Module ./BuildFunctions.psm1
    cd ..

    $allTasks = GetTypeScriptTaskModules

    if($TasksToBuild -eq $null) {
        $tasks = $allTasks
    } else {
        $tasks = $allTasks | ? {$_ -in $TasksToBuild}
        $TasksToBuild |
            ? { $_ -notin $allTasks } |
            % { Write-Warning "$_ is not a valid task" }
    }

    if(Test-Path bin) {
        Write-Verbose "Removing bin"
        rm bin -Force -Recurse -ErrorAction Stop
    }

    if (-not $SkipInit){
        InitAll $tasks
    }

    if (-not $SkipCompile) {
        CompileAll $tasks
    }
        
    if (-not $SkipTest) {
        TestAll $tasks
    }

    if (Test-Path env:TfsBuildAgentPath) {
        PublishTasksLocal $tasks
    }

    if(-not $SkipPackage) {
        Package $tasks
    }
} finally {
    Get-Module "BuildFunctions" | Remove-Module
    popd
}
