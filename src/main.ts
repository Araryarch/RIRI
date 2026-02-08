#!/usr/bin/env node

/**
 * Main entry point for RiriLang compiler
 */
import { CLI } from './cli/CLI';

const cli = new CLI(process.argv.slice(2));
cli.run().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
