import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        return 'vendor';
                    }
                    if (id.includes('src/components')) {
                        return 'components';
                    }
                    if (id.includes('src/views')) {
                        return 'views';
                    }
                    if (id.includes('src/assets')) {
                        return 'assets';
                    }
                }
            }
        }
    }
});