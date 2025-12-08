const path = require('path');

function loadFirebaseAuth() {
    // Bypass Webpack static analysis entirely
    const dynamicRequire = eval('require');

    try {
        // Try direct require first
        return dynamicRequire('firebase-admin/lib/auth/index.js');
    } catch (e) {
        if (e.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED' || e.code === 'MODULE_NOT_FOUND') {
            // Fallback: Construct absolute path assuming standard node_modules structure
            // This bypasses package exports constraint
            const cwd = process.cwd();
            const authPath = path.join(cwd, 'node_modules/firebase-admin/lib/auth/index.js');
            return dynamicRequire(authPath);
        }
        throw e;
    }
}

const mod = loadFirebaseAuth();
module.exports = mod;
