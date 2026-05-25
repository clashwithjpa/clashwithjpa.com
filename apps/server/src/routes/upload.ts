import { isManager } from "@/lib/auth/functions";
import { config } from "@/lib/config";
import { hasAccessAuthMiddleware } from "@/lib/middlewares";
import { type AppEnv } from "@/lib/types";
import { CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

const upload = new Hono<AppEnv>();

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const MIME_TO_EXT: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
};
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const s3 = new S3Client({
    endpoint: config.MINIO_ENDPOINT,
    region: "us-east-1",
    credentials: {
        accessKeyId: config.MINIO_ROOT_USER,
        secretAccessKey: config.MINIO_ROOT_PASSWORD,
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
        const policy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
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

upload.post(
    "/",
    hasAccessAuthMiddleware(isManager),
    bodyLimit({
        maxSize: MAX_UPLOAD_BYTES,
        onError: (c) => c.json({ success: false, error: "File exceeds maximum size of 5 MB" }, 413),
    }),
    async (c) => {
        try {
            const body = await c.req.parseBody();
            const file = body["file"];

            if (!file || !(file instanceof File)) {
                return c.json({ success: false, error: "No file uploaded" }, 400);
            }

            if (!ALLOWED_MIME_TYPES.has(file.type)) {
                return c.json({ success: false, error: "Unsupported file type" }, 415);
            }

            // Derive extension from validated MIME instead of trusting the client filename.
            const ext = MIME_TO_EXT[file.type];
            const uniqueFilename = `${crypto.randomUUID()}.${ext}`;

            const arrayBuffer = await file.arrayBuffer();

            await s3.send(
                new PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: uniqueFilename,
                    Body: Buffer.from(arrayBuffer),
                    ContentType: file.type,
                }),
            );

            const fileUrl = `${config.MINIO_PUBLIC_URL}/${BUCKET_NAME}/${uniqueFilename}`;

            return c.json({ success: true, data: { url: fileUrl } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to upload file" }, 500);
        }
    },
);

export default upload;
