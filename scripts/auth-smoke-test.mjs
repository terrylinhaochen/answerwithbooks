// Read-only default. Never implicitly send mail or treat throttling as successful signup.
import {existsSync} from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
await import('./check-account-auth.mjs');
console.log('No inbox delivery was tested. See docs/SIGNUP_TRACKING.md for opt-in live acceptance.');
