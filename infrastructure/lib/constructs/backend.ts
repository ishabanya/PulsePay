import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface BackendProps {
  vpc: ec2.IVpc;
  secrets: { [key: string]: secretsmanager.ISecret };
}

export class Backend extends Construct {
  public readonly service: ecsPatterns.ApplicationLoadBalancedFargateService;
  public readonly cluster: ecs.Cluster;
  public readonly repository: ecr.Repository;
  public readonly loadBalancerDnsName: string;

  constructor(scope: Construct, id: string, props: BackendProps) {
    super(scope, id);

    this.repository = new ecr.Repository(this, 'Repository', {
      repositoryName: 'payment-app-backend',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      imageScanOnPush: true,
    });

    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: 'payment-app-cluster',
      containerInsights: true,
    });

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: '/ecs/payment-app-backend',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    Object.values(props.secrets).forEach(secret => {
      secret.grantRead(taskDefinition.taskRole);
    });

    const container = taskDefinition.addContainer('Container', {
      image: ecs.ContainerImage.fromEcrRepository(this.repository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'payment-app',
        logGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '5000',
      },
      secrets: {
        FIREBASE_PROJECT_ID: ecs.Secret.fromSecretsManager(props.secrets.firebase, 'projectId'),
        FIREBASE_CLIENT_EMAIL: ecs.Secret.fromSecretsManager(props.secrets.firebase, 'clientEmail'),
        FIREBASE_PRIVATE_KEY: ecs.Secret.fromSecretsManager(props.secrets.firebase, 'privateKey'),
        STRIPE_SECRET_KEY: ecs.Secret.fromSecretsManager(props.secrets.stripe, 'secretKey'),
        STRIPE_WEBHOOK_SECRET: ecs.Secret.fromSecretsManager(props.secrets.stripe, 'webhookSecret'),
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:5000/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    container.addPortMappings({
      containerPort: 5000,
      protocol: ecs.Protocol.TCP,
    });

    this.service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster: this.cluster,
      taskDefinition,
      publicLoadBalancer: true,
      desiredCount: 2,
      listenerPort: 443,
      protocol: ecsPatterns.ApplicationProtocol.HTTPS,
      redirectHTTP: true,
      domainName: 'api.payment-app.com',
      enableLogging: true,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    });

    this.service.targetGroup.configureHealthCheck({
      path: '/health',
      protocol: ecs.Protocol.TCP,
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    this.service.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 10,
    }).scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.minutes(5),
      scaleOutCooldown: cdk.Duration.minutes(5),
    });

    this.loadBalancerDnsName = this.service.loadBalancer.loadBalancerDnsName;

    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.loadBalancerDnsName,
      description: 'Load Balancer DNS Name',
    });

    new cdk.CfnOutput(this, 'RepositoryURI', {
      value: this.repository.repositoryUri,
      description: 'ECR Repository URI',
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster Name',
    });
  }
}