"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
var pg_1 = require("pg");
var adapter_pg_1 = require("@prisma/adapter-pg");
var client_1 = require("@prisma/client");
var dotenv_1 = require("dotenv");
// Force load from .env file to prevent shell environment variable conflicts
dotenv_1.default.config({ path: '.env', override: true });
var connectionString = process.env.DATABASE_URL || "";
if (!connectionString.includes("pgbouncer=true") && connectionString.includes("pooler.supabase.com")) {
    connectionString += connectionString.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true";
}
var globalForPrisma = globalThis;
var prisma;
if (process.env.NODE_ENV === 'production') {
    var pool = new pg_1.Pool({
        connectionString: connectionString,
        max: 2, // Vercel functions scale horizontally, so keep per-instance pool very small
        idleTimeoutMillis: 3000, // Aggressively close idle connections in serverless
        connectionTimeoutMillis: 5000
    });
    var adapter = new adapter_pg_1.PrismaPg(pool);
    exports.prisma = prisma = new client_1.PrismaClient({ adapter: adapter });
}
else {
    if (!globalForPrisma.prisma) {
        var pool = new pg_1.Pool({
            connectionString: connectionString,
            max: 5, // Limit connections in dev
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 5000
        });
        var adapter = new adapter_pg_1.PrismaPg(pool);
        globalForPrisma.prisma = new client_1.PrismaClient({ adapter: adapter });
    }
    exports.prisma = prisma = globalForPrisma.prisma;
}
