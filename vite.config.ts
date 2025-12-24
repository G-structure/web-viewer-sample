/*
 * SPDX-FileCopyrightText: Copyright (c) 2024 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-NvidiaProprietary
 *
 * NVIDIA CORPORATION, its affiliates and licensors retain all intellectual
 * property and proprietary rights in and to this material, related
 * documentation and any modifications thereto. Any use, reproduction,
 * disclosure or distribution of this material and related documentation
 * without an express license agreement from NVIDIA CORPORATION or
 * its affiliates is strictly prohibited.
 */
import { defineConfig } from "vite";
import { viteExternalsPlugin } from 'vite-plugin-externals';
import react from "@vitejs/plugin-react";
import { resolve } from 'path';

// Build mode: 'synth' for Synth Control Plane viewer, 'nvidia' for original
const buildMode = process.env.BUILD_MODE || 'synth';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        viteExternalsPlugin({
            GFN: 'GFN'
        }),
    ],
    build: {
        rollupOptions: {
            input: buildMode === 'synth'
                ? resolve(__dirname, 'synth.html')
                : resolve(__dirname, 'index.html'),
        },
        // Rename synth.html to index.html in output for Cloudflare Pages
        ...(buildMode === 'synth' && {
            outDir: 'dist',
        }),
    },
    // For Synth mode, redirect root to synth.html in dev
    ...(buildMode === 'synth' && {
        server: {
            open: '/synth.html',
        },
    }),
});
