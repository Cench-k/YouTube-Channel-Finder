import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    __app_id: JSON.stringify('yt-finder-v1'),
  },
})
