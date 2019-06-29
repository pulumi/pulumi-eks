// Enable the deletion of the 2xlarge node group.
export const config = {
    createNodeGroup2xlarge: false,
    desiredCapacity2xlarge: 0,
    createNodeGroup4xlarge: true,
    desiredCapacity4xlarge: 5,
    nginxNodeSelectorTermValues: ["c5.4xlarge"],
};
