import * as k8s from "@kubernetes/client-node";
import * as AWS from "aws-sdk";
import * as signer from "aws-signature-v4";
import base64url from "base64url";
import * as querystring from "querystring";

module.exports.drain = async (event, context, callback) => {
  console.log(event);

  const instanceId = event.detail.EC2InstanceId;
  const eventAsgName = event.detail.AutoScalingGroupName;
  const { ASG_NAME } = process.env;
  const region = event.region;

  // check if asg matches
  if (!eventAsgName.includes(ASG_NAME)) {
    callback(null);
  }

  // build eks cluster api
  const eksCluster = await getEKSCluster(instanceId, region);
  const userToken = await getBearerToken(eksCluster.name);
  const k8sApi = getEKSClient(
    eksCluster.cluster.endpoint,
    eksCluster.cluster.certificateAuthority.data,
    userToken,
  );

  // match ec2 instance id to eks node
  const eksNodeName = await getEKSNodeName(instanceId, k8sApi, region);

  // cordon the node
  await k8sApi
    .patchNode(
      eksNodeName,
      { spec: { unschedulable: true } },
      undefined,
      undefined,
      {
        headers: { "Content-Type": "application/merge-patch+json" }
      },
    )
    .then(res => {
      console.log(`Successfully cordoned node ${res.body.metadata.name}`);
    })
    .catch(err => {
      throw new Error(`Failed to cordon node: ${err}`);
    });

  // get list of pods that are still running, exclude daemonsets
  let pods = {};
  await k8sApi
    .listPodForAllNamespaces()
    .then(res => {
      res.body.items.filter(pod => {
        if (
          pod.spec.nodeName === eksNodeName &&
          pod.metadata.ownerReferences[0].kind !== "DaemonSet"
        ) {
          pods[pod.metadata.name] = pod.metadata.namespace;
        }
      });
    })
    .catch(err => {
      throw new Error(`Failed to get list of pods: ${JSON.stringify(err)}`);
    });

  // move all pods to new nodes
  while (Object.keys(pods).length !== 0) {
    await Promise.all(
      Object.keys(pods).map(pod => {
        k8sApi
          .createNamespacedPodEviction(pod, pods[pod], {
            metadata: { name: pod }
          })
          .then(eviction => {
            console.log(`Successfully evicted pod ${pod}`);
            delete pods[pod];
          })
          .catch(err => {
            if (
              err.response.body.details.causes[0].reason === "DisruptionBudget"
            ) {
              console.log(
                `Waiting to evict pod: ${
                  err.response.body.details.causes[0].message
                }`
              );
            } else {
              throw new Error(`Failed to evict pod: ${JSON.stringify(err)}`);
            }
          });
      }),
    );

    // wait 15 seconds before attempting another eviction round
    console.log("Sleeping for 15 seconds before evicting the remaining pods");
    await new Promise(resolve => setTimeout(resolve, 15000));
  }

  // complete the asg lifecycle hook
  console.log(`Completing ASG lifecycle action.`);
  const asg = new AWS.AutoScaling({ region: region });
  await asg
    .completeLifecycleAction({
      AutoScalingGroupName: event.detail.AutoScalingGroupName,
      LifecycleActionResult: "CONTINUE",
      LifecycleHookName: event.detail.LifecycleHookName,
      LifecycleActionToken: event.detail.LifecycleActionToken,
    })
    .promise().catch(err => {
      throw new Error(`Failed to complete lifecycle action: ${JSON.stringify(err)}`);
    });
  console.log(`ASG lifecycle action completed.`);

  callback(null);
};

const getEKSNodeName = async (instanceId: string, k8sApi: k8s.CoreV1Api, region: string) => {
  // filter ec2 nodes
  console.log(`Getting data for EC2 instance: ${instanceId}`);
  const ec2 = new AWS.EC2({ region: region });
  const ec2Instances = await ec2
    .describeInstances({
      InstanceIds: [instanceId],
    })
    .promise().catch(err => {
      throw new Error(`Failed to describe EC2 instances: ${JSON.stringify(err)}`);
    });
  const ec2PrivateDNS = ec2Instances.Reservations[0].Instances[0].PrivateDnsName;
  console.log(JSON.stringify(ec2Instances));
  console.log(`Found EC2 Instance: ${ec2PrivateDNS}`);

  // filter eks nodes
  const eksNodes = await k8sApi.listNode().catch(err => {
    throw new Error(`Failed to list Kubernetes Nodes: ${JSON.stringify(err)}`);
  });
  console.log(`Found EKS Nodes: ${JSON.stringify(eksNodes)}`);
  const eksNode = eksNodes.body.items.find(
    node =>
      node.status.addresses.find(address => address.type === "InternalDNS")
        .address === ec2PrivateDNS,
  );
  console.log(`Filtered EKS Node: ${JSON.stringify(eksNode)}`);
  const eksNodeName = eksNode.metadata.name;

  console.log(
    `Matched EC2 instance: ${ec2PrivateDNS} with EKS node: ${eksNodeName}`,
  );

  return eksNode.metadata.name;
};

const getEKSCluster = async (instanceId: string, region: string) => {
  const ec2 = new AWS.EC2({ region: region });
  const eks = new AWS.EKS({ region: region });

  // get eks cluster info
  let instanceTags = [];
  console.log(`Getting tags for instance: ${instanceId}`);
  await ec2
    .describeTags({
      Filters: [
        {
          Name: "resource-id",
          Values: [instanceId],
        }
      ]
    })
    .promise()
    .then(data => {
      instanceTags = data.Tags;
    })
    .catch(err => {
      throw new Error(`Failed to get instance tags: ${JSON.stringify(err)}`);
    });
  console.log(`Found tags: ${JSON.stringify(instanceTags)}`);

  const clusterTag = instanceTags.find(
    tag => tag.Key.startsWith("kubernetes.io/cluster/") && tag.Value == "owned",
  );
  console.log(`K8S Cluster Tag: ${JSON.stringify(clusterTag)}`);
  const clusterName = clusterTag.Key.replace("kubernetes.io/cluster/", "");
  console.log(`K8S Cluster Name: ${clusterName}`);

  // get eks cluster info
  const eksCluster = await eks
    .describeCluster({ name: clusterName })
    .promise()
    .catch(err => {
      throw new Error(`Failed to describe EKS cluster: ${JSON.stringify(err)}`);
    });

  return { name: clusterName, cluster: eksCluster.cluster };
};

const getEKSClient = (endpoint: string, caData: string, token: string) => {
  const kubeconfig = {
    clusters: [
      {
        server: endpoint,
        caData: caData,
        name: "kubernetes",
        skipTLSVerify: false,
      }
    ],
    contexts: [
      { cluster: "kubernetes", user: "aws", name: "aws", namespace: "default" }
    ],
    currentContext: "aws",
    users: [
      {
        name: "aws",
        token: token,
      },
    ],
  };

  const kc = new k8s.KubeConfig();
  kc.loadFromOptions(kubeconfig);
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  return k8sApi;
};

const getBearerToken = async clusterId => {
  // get aws session credentials
  const sts = new AWS.STS();
  const awsCreds = { Credentials: {
      AccessKeyId: AWS.config.credentials.accessKeyId,
      SecretAccessKey: AWS.config.credentials.secretAccessKey,
      SessionToken: AWS.config.credentials.sessionToken,
    }};
  console.log(`AWS_ACCESS_KEY_ID: ${awsCreds.Credentials.AccessKeyId}`);

  // create pre-signed url token for aws-iam-authenticator
  const fullUrl = generatePresignedSTSURL({
    key: awsCreds.Credentials.AccessKeyId,
    secret: awsCreds.Credentials.SecretAccessKey,
    sessionToken: awsCreds.Credentials.SessionToken,
    expires: 60,
    clusterId: clusterId,
  });

  const fullUrlBase64 = base64url.encode(fullUrl);
  const token = `k8s-aws-v1.${fullUrlBase64}`;

  return token;
};

const generatePresignedSTSURL = function(options) {
  const region = options.region || "us-east-1";
  const datetime = Date.now();
  const host = options.region
    ? `sts.${options.region}.amazonaws.com`
    : "sts.amazonaws.com";
  const headers = { "x-k8s-aws-id": options.clusterId, Host: host };

  let query = {
    Action: "GetCallerIdentity",
    Version: "2011-06-15",
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential":
      options.key + "/" + signer.createCredentialScope(datetime, region, "sts"),
    "X-Amz-Date": new Date(datetime)
      .toISOString()
      .replace(/[:\-]|\.\d{3}/g, ""),
    "X-Amz-Expires": options.expires,
    "X-Amz-SignedHeaders": signer.createSignedHeaders(headers),
    "X-Amz-Security-Token": options.sessionToken,
  };

  const canonicalRequest = signer.createCanonicalRequest(
    "GET",
    "/",
    query,
    headers,
    "",
    true,
  );
  const stringToSign = signer.createStringToSign(
    datetime,
    region,
    "sts",
    canonicalRequest,
  );
  const signature = signer.createSignature(
    options.secret,
    datetime,
    region,
    "sts",
    stringToSign,
  );
  query["X-Amz-Signature"] = signature;

  return `https://${host}/?${querystring.stringify(query)}`;
};
