import * as path from "node:path";
import { createLogger, format, transports } from "winston";

const logDir = path.resolve(process.cwd(), "logs");

const logFormat = format.printf(function (info) {
    return `${String(info["timestamp"])} - ${info.level}: ${JSON.stringify(info["stack"] ?? info.message, null, 2)}`;
});

export const logger = createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: format.combine(
        format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json({
            space: 2,
        }),
    ),
    exitOnError: false,
    silent: !process.env.ENABLE_LOGGING || process.env.ENABLE_LOGGING === "false",
});

if (process.env.ENABLE_LOGGING === "true") {
    if (process.env.ENABLED_LOG_TRANSPORTS?.includes("console")) {
        logger.add(
            new transports.Console({
                format: format.combine(format.json({ space: 2 }), format.colorize(), logFormat),
            }),
        );
    }

    if (process.env.ENABLED_LOG_TRANSPORTS?.includes("file")) {
        logger.add(
            new transports.File({
                filename: "error.log",
                dirname: logDir,
                level: "error",
                tailable: true,
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
                zippedArchive: true,
            }),
        );

        logger.add(
            new transports.File({
                filename: "combined.log",
                dirname: logDir,
                tailable: true,
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
            }),
        );

        logger.exceptions.handle(
            new transports.File({
                filename: "exceptions.log",
                dirname: logDir,
                tailable: true,
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
            }),
        );
    }
}
