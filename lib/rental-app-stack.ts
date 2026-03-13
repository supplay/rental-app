import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda'; // ここを lambda に戻す
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as path from 'path';

export class RentalAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'ReservationsTable', {
      partitionKey: { name: 'reservationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const reservationHandler = new lambda.Function(this, 'ReservationHandler', {
      runtime: lambda.Runtime.NODEJS_16_X, // 16なら古いSDKが標準で入っています
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(reservationHandler);

    new apigw.LambdaRestApi(this, 'ReservationApi', {
      handler: reservationHandler,
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type'],
      },
    });

    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'home.html',
      websiteErrorDocument: 'home.html',
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        ignorePublicAcls: true,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new s3deploy.BucketDeployment(this, 'DeployStaticWebsite', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '..'), {
          exclude: [
            'bin/**',
            'cdk.out/**',
            'lambda/**',
            'lib/**',
            'node_modules/**',
            'test/**',
            '*.d.ts',
            '*.js',
            '*.ts',
            'cdk.json',
            'jest.config.js',
            'package-lock.json',
            'package.json',
            'README.md',
            'tsconfig.json',
          ],
        }),
      ],
      destinationBucket: websiteBucket,
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: websiteBucket.bucketWebsiteUrl,
      description: 'S3 static website URL',
    });
  }
}