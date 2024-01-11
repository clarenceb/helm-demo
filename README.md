Helm demo
=========

Prerequisites
-------------

* Node JS version 14.0.0 or higher
* NPM
* Helm v3
* Kubectl
* Kubernetes Cluster
* Docker Desktop (optional)

(Optional) Test the app locally
-------------------------------

```sh
cd app/
npm install
node app.js
# http://localhost:3000
```

Access the site at: [http://localhost:3000](http://localhost:3000)

Build the Docker image locally
------------------------------

```sh
cd app/
docker build -t helm-demo-app:v1.0.0 .

# Run with defaults
docker run --rm -p 3000:3000 helm-demo-app:v1.0.0

# Run with overriding environment variables
docker run --rm -e BG_COLOR=bg-info -e MY_POD_NAMESPACE=tenant1 -e JOKE_CATEGORY=food -p 3000:3000 helm-demo-app:v1.0.0
```

Build remotely using ACR Build
------------------------------

Create an Azure Container Registry:

```sh
RESOURCE_GROUP=helm-demo
LOCATION=australiaeast
ACR_NAME=helmdemo$(openssl rand -hex 5)

az group create --name $RESOURCE_GROUP --location $LOCATION
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic
```

Build the Docker image using ACR Build:

```sh
cd app/
az acr build --registry $ACR_NAME --image helm-demo-app:v1.0.0 .
```

Create a Kubernetes cluster
---------------------------

```sh
RESOURCE_GROUP=helm-demo
LOCATION=australiaeast
AKS_NAME=helmdemo

az aks create \
    --resource-group $RESOURCE_GROUP \
    --name $AKS_NAME \
    --node-count 1 \
    --enable-addons monitoring \
    --network-plugin azure \
    --network-policy azure \
    --generate-ssh-keys

az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_NAME
kubectl get nodes

az aks update \
    --resource-group $RESOURCE_GROUP \
    --name $AKS_NAME \
    --attach-acr $ACR_NAME
```

Deploy app to Kubernetes
------------------------

```sh
export ACR_NAME
envsubst '$ACR_NAME' < kubernetes/app.yaml | kubectl apply -f -
```

Install Helm
------------

* Helm v3 is a client-side tool that works with your Kube Config to manage Helm Charts (packages) deployed to your cluster
* You can [install Helm](https://helm.sh/docs/intro/install/) via a script, binary, or package manager

Create a blank chart for a new project
--------------------------------------

```sh
helm create helm-demo
helm install helm-demo helm-demo --dry-run

# Edit the helm,-demo to remove unneeded files
```

Install the default app into default namespace:

```sh
cd helm/

helm  upgrade --install helm-demo helm-demo --set image.repository=$ACR_NAME.azurecr.io/helm-demo-app
helm ls
helm show values helm-demo
kubectl get pod,deployment,svc,ingress
kubectl port-forward svc/helm-demo 8080:80
```

Access the site via: http://localhost:8008

Now deploy 2 instances of the app to different namespaces:

```sh
cd helm/

helm  upgrade --install helm-demo helm-demo --namespace tenant1 --create-namespace --set image.repository=$ACR_NAME.azurecr.io/helm-demo-app --set app.bgColor=bg-info --set app.jokeCategory=food

helm  upgrade --install helm-demo helm-demo --namespace tenant2 --create-namespace --set image.repository=$ACR_NAME.azurecr.io/helm-demo-app --set app.bgColor=bg-warning --set app.jokeCategory=science

helm ls -A
kubectl get pod,svc -n tenant1
kubectl get pod,svc -n tenant2

helm show values helm-demo -n tenant1
helm get values helm-demo -n tenant1
helm show values helm-demo -n tenant2
helm get values helm-demo -n tenant2

kubectl port-forward -n tenant1 svc/helm-demo 8081:80 &
kubectl port-forward -n tenant2 svc/helm-demo 8082:80 &

# Access the sites via:
# http://localhost:8081
# http://localhost:8082

kill %1
kill %2
```

Publish Helm Chart to ACR
-------------------------

```sh
cd helm/
helm package .

# Authenticate with your individual Microsoft Entra identity to push and pull Helm charts using an AD token.
USER_NAME="00000000-0000-0000-0000-000000000000"
PASSWORD=$(az acr login --name $ACR_NAME --expose-token --output tsv --query accessToken)

# Login to ACR using Helm
helm registry login $ACR_NAME.azurecr.io \
  --username $USER_NAME \
  --password $PASSWORD

# Push the Helm chart to ACR
helm push helm-demo-0.1.0.tgz oci://$ACR_NAME.azurecr.io/helm

az acr repository show \
  --name $ACR_NAME \
  --repository helm/helm-demo

az acr manifest list-metadata \
  --registry $ACR_NAME \
  --name helm/helm-demo
```

Install the Helm Chart from ACR to AKS
--------------------------------------

```sh
helm upgrade --install helm-demo oci://$ACR_NAME.azurecr.io/helm/helm-demo --version 0.1.0 --set image.repository=$ACR_NAME.azurecr.io/helm-demo-app

helm get manifest helm-demo

helm upgrade --install helm-demo oci://$ACR_NAME.azurecr.io/helm/helm-demo --version 0.1.0 --set image.repository=$ACR_NAME.azurecr.io/helm-demo-app --set app.jokeCategory=sport

helm get values helm-demo
```

Rolback to previous version
---------------------------

```sh
helm ls
helm rollback helm-demo 0
```

Cleanup
-------

```sh
helm del helm-demo
helm del helm-demo -n tenant1
helm del helm-demo -n tenant2
```
