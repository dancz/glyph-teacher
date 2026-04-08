import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
let commitHash = 'unknown';
try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
}
catch (e) {
    console.log('Failed to get git commit hash', e);
}
const buildDate = new Date().toISOString().split('T')[0];
const appVersion = `${commitHash} (${buildDate})`;
// https://vite.dev/config/
export default defineConfig({
    base: '/glyph-teacher/',
    plugins: [react()],
    define: {
        __APP_VERSION__: JSON.stringify(appVersion)
    }
});
