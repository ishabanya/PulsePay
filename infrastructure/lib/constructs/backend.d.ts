import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
export interface BackendProps {
    vpc: ec2.IVpc;
    secrets: {
        [key: string]: secretsmanager.ISecret;
    };
}
export declare class Backend extends Construct {
    readonly service: ecsPatterns.ApplicationLoadBalancedFargateService;
    readonly cluster: ecs.Cluster;
    readonly repository: ecr.Repository;
    readonly loadBalancerDnsName: string;
    constructor(scope: Construct, id: string, props: BackendProps);
}
