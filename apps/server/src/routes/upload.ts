import { config } from "@/lib/config";
import { type AppEnv } from "@/lib/types";
import { CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import * as Sentry from "@sentry/bun";
import { Hono } from "hono";

const upload = new Hono<AppEnv>();

const s3 = new S3Client({
    endpoint: config.MINIO_ENDPOINT,
    region: "us-east-1",
    credentials: {
        accessKeyId: config.MINIO_ROOT_USER!,
        secretAccessKey: config.MINIO_ROOT_PASSWORD!,
    },
    forcePathStyle: true,
});

const BUCKET_NAME = "uploads";

async function ensureBucket() {
    try {
        await s3.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    } catch (error: any) {
        if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
            await s3.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
        }
    }

    try {
        // Always try to set the public read policy to ensure it's applied even if the bucket already existed
        const policy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: { AWS: ["*"] },
                    Action: ["s3:GetObject"],
                    Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
                },
            ],
        };

        await s3.send(
            new PutBucketPolicyCommand({
                Bucket: BUCKET_NAME,
                Policy: JSON.stringify(policy),
            }),
        );
    } catch (policyError) {
        Sentry.captureException(policyError);
    }
}

// Call once on startup
ensureBucket().catch(Sentry.captureException);

upload.post("/", async (c) => {
    try {
        const body = await c.req.parseBody();
        const file = body["file"];

        if (!file || !(file instanceof File)) {
            return c.json({ error: "No file uploaded" }, 400);
        }

        const ext = file.name.split(".").pop() || "png";
        const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();

        await ensureBucket();

        await s3.send(
            new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: uniqueFilename,
                Body: Buffer.from(arrayBuffer),
                ContentType: file.type,
            }),
        );

        const fileUrl = `${config.MINIO_PUBLIC_URL}/${BUCKET_NAME}/${uniqueFilename}`;

        return c.json({ url: fileUrl });
    } catch (error) {
        Sentry.captureException(error);
        return c.json({ error: "Failed to upload file" }, 500);
    }
});

export default upload;
