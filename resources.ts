const resources = {
  resources: {
    Resources: {
      ServerlessCacheSubnetGroup: {
        Type: "AWS::ElastiCache::SubnetGroup",
        Properties: {
          Description: "Cache Subnet Group",
          // @TODO: replace this with dynamic values
          SubnetIds: [
            "${self:custom.PRIVATE_SUBNET_1}",
            "${self:custom.PRIVATE_SUBNET_2}",
            "${self:custom.PRIVATE_SUBNET_3}",
          ],
        },
      },
      ElasticCacheCluster: {
        // DependsOn: "ServerlessStorageSecurityGroup" // After integrating VPC and security
        Type: "AWS::ElastiCache::CacheCluster",
        Properties: {
          AutoMinorVersionUpgrade: true,
          Engine: "redis",
          CacheNodeType: "${self:custom.CACHE_INSTANCE_SIZE}",
          NumCacheNodes: 1,
          // see resources tmp file
          // CacheSubnetGroupName: [{ Ref: "ServerlessCacheSubnetGroup" }]
          // @TODO: replace this with dynamic values
          VpcSecurityGroupIds: ["${self:custom.VPC_SECURITY_GROUP}"],
          // VpcSecurityGroupIds:[{ "Fn::GetAtt": "ServerlessStorageSecurityGroup.GroupId" }]
          // VpcSecurityGroupIds:
          // - "Fn::GetAtt": ServerlessStorageSecurityGroup.GroupId
        },
      },
    },
  },
};