"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../src/generated/prisma");
// Configure connection pooling for different environments
const createPrismaClient = () => {
    const isTest = process.env.NODE_ENV === 'test';
    // Build database URL with connection pool settings
    const baseUrl = process.env.DATABASE_URL;
    if (!baseUrl) {
        throw new Error('DATABASE_URL environment variable is required');
    }
    // Add connection pool parameters to URL
    const url = new URL(baseUrl);
    if (isTest) {
        // Reduce connection pool for testing to avoid exhausting Supabase free plan
        url.searchParams.set('connection_limit', '5');
        url.searchParams.set('pool_timeout', '20');
    }
    else {
        // Production settings for better performance
        url.searchParams.set('connection_limit', '10');
        url.searchParams.set('pool_timeout', '10');
    }
    return new prisma_1.PrismaClient({
        datasources: {
            db: {
                url: url.toString(),
            },
        },
    });
};
const prisma = globalThis.prisma || createPrismaClient();
if (process.env.NODE_ENV !== 'production')
    globalThis.prisma = prisma;
exports.default = prisma;
