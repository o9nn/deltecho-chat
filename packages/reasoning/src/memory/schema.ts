import { pgTable, varchar, doublePrecision, timestamp, json, text, customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Define a custom type for embeddings (FLOAT[])
const floatArray = customType<{ data: number[], driverData: string }>({
    dataType() {
        return 'FLOAT[]';
    },
    toDriver(value: number[]): string {
        return `[${value.join(',')}]`;
    },
    fromDriver(value: string): number[] {
        // Parse "[1.0, 2.0]" string from DB
        if (!value) return [];
        return JSON.parse(value);
    },
});

export const atoms = pgTable('atoms', {
    id: varchar('id').primaryKey(),
    type: varchar('type').notNull(),
    name: varchar('name'),
    strength: doublePrecision('strength').default(1.0),
    confidence: doublePrecision('confidence').default(1.0),
    metadata: json('metadata'),
    embedding: text('embedding'), // Saving as text/string for simplicity in WASM if array fails, but customType is better if supported logic lines up
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const links = pgTable('links', {
    id: varchar('id').primaryKey(),
    type: varchar('type').notNull(),
    handleList: text('handle_list'), // Store JSON string of IDs
    strength: doublePrecision('strength').default(1.0),
    confidence: doublePrecision('confidence').default(1.0),
});
