// Migrate NGINX from the 2xlarge -> 4xlarge node group.
export const config = {
    createNodeGroup2xlarge: true,
    desiredCapacity2xlarge: 3,
    createNodeGroup4xlarge: true,
    desiredCapacity4xlarge: 5,
    nginxNodeSelectorTermValues: ["c5.4xlarge"],
    deployWorkload: true,
};
