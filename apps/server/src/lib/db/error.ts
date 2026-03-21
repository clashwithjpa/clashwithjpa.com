/*
  Source: https://github.com/drizzle-team/drizzle-orm/discussions/916#discussioncomment-14498892
  Modified: Added code to the return type and the handler functions
*/

import { DrizzleQueryError, DrizzleError } from "drizzle-orm";
import { DatabaseError } from "pg";

// Defines the shape of the error handler functions
type ErrorHandler = (error: DatabaseError) => { message: string; constraint: string | null; code: string | null };

// Maps PostgreSQL error codes to specific handler functions
const PostgresErrorHandlers: Record<string, ErrorHandler> = {
    "23505": (error) => ({
        message: "A duplicate entry was found for a unique field.",
        constraint: error.constraint || null,
        code: error.code || null,
    }),
    "23503": (error) => ({
        message: "A foreign key violation occurred. The record you are trying to link does not exist.",
        constraint: error.constraint || null,
        code: error.code || null,
    }),
    "22P02": (error) => ({
        message: "The data provided is in an invalid format (e.g., not a valid UUID).",
        constraint: null,
        code: error.code || null,
    }),
    "23514": (error) => ({
        message: "A check constraint was violated.",
        constraint: error.constraint || null,
        code: error.code || null,
    }),
    "23502": (error) => ({
        message: `A required field is missing. The column '${error.column}' cannot be null.`,
        constraint: error.column || null,
        code: error.code || null,
    }),
    "42703": (error) => ({
        message: "An undefined column was referenced in the query.",
        constraint: error.column || null,
        code: error.code || null,
    }),
    "42601": (error) => ({
        message: "There's a syntax error in the database query.",
        constraint: null,
        code: error.code || null,
    }),
    "25000": (error) => ({
        message: "Transaction failed: a data integrity issue occurred within a database transaction.",
        constraint: null,
        code: error.code || null,
    }),
    "08006": (error) => ({
        message: "Database connection failed. The database may be unavailable.",
        constraint: null,
        code: error.code || null,
    }),
    "42P01": (error) => ({
        message: "A referenced table does not exist in the database.",
        constraint: null,
        code: error.code || null,
    }),
    "40001": (error) => ({
        message: "Transaction serialization failure. Please retry the transaction as it could not be completed due to concurrent modifications.",
        constraint: null,
        code: error.code || null,
    }),
    default: (error) => ({
        message: `A database error occurred: ${error.message}`,
        constraint: null,
        code: error.code || null,
    }),
};

/**
 * Extracts a user-friendly message and constraint from a Drizzle ORM error.
 * @param error The error object from Drizzle.
 * @returns An object with the main error message and constraint name (if applicable).
 */
export function getDbErrorMessage(error: unknown): { message: string; constraint: string | null; code: string | null } {
    if (error instanceof DrizzleQueryError && error.cause instanceof DatabaseError) {
        const originalError = error.cause;
        const handler = PostgresErrorHandlers[originalError.code ?? "default"];

        if (handler) {
            return handler(originalError);
        }

        // Default case for any other unhandled DatabaseError
        return {
            message: `A database error occurred: ${originalError.message}`,
            constraint: null,
            code: originalError.code || null,
        };
    }

    // Fallback for generic Drizzle errors or other Error instances
    if (error instanceof DrizzleError || error instanceof Error) {
        return {
            message: error.message || "An unexpected error occurred.",
            constraint: null,
            code: null,
        };
    }

    // Final fallback for unknown error types
    return { message: "An unknown error occurred.", constraint: null, code: null };
}
