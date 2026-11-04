import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.AWS_ENDPOINT_URL_S3;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || "ap-southeast-1";
const bucketName = process.env.S3_BUCKET_NAME || "order-uploads";

export function isS3Configured(): boolean {
  return Boolean(endpoint && accessKeyId && secretAccessKey);
}

let s3ClientInstance: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error("S3 Object Storage is not properly configured in environment variables");
    }
    s3ClientInstance = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }
  return s3ClientInstance;
}

/**
 * Ensures bucket exists (creates if not present)
 */
export async function ensureBucketExists(): Promise<void> {
  const client = getS3Client();
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
  } catch (err: any) {
    // If bucket doesn't exist, try creating it
    if (err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
      try {
        await client.send(new CreateBucketCommand({ Bucket: bucketName }));
      } catch (createErr) {
        console.warn("Could not auto-create bucket:", createErr);
      }
    }
  }
}

/**
 * Uploads a binary buffer to S3 bucket and returns its key & presigned download URL
 */
export async function uploadMediaToS3(params: {
  buffer: Buffer;
  key: string;
  contentType: string;
  metadata?: Record<string, string>;
}): Promise<{ key: string; signedUrl: string; bucket: string }> {
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: params.key,
    Body: params.buffer,
    ContentType: params.contentType,
    Metadata: params.metadata,
  });

  await client.send(command);

  // Generate a signed URL for viewing (valid for 7 days = 604800 seconds)
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: params.key,
  });
  const signedUrl = await getSignedUrl(client, getCommand, { expiresIn: 604800 });

  return {
    key: params.key,
    signedUrl,
    bucket: bucketName,
  };
}

/**
 * Generate a fresh presigned URL for an existing S3 object key
 */
export async function getMediaSignedUrl(key: string, expiresInSeconds: number = 604800): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
