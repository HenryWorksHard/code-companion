import { NextResponse } from 'next/server';

interface DeployRequest {
  code: {
    'page.tsx': string;
    'globals.css'?: string;
  };
  projectName: string;
}

// Generate a complete Next.js project structure
function generateProjectFiles(code: DeployRequest['code'], projectName: string) {
  const files: Record<string, string> = {};

  // package.json
  files['package.json'] = JSON.stringify({
    name: projectName,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
    },
    dependencies: {
      next: '^15.0.0',
      react: '^19.0.0',
      'react-dom': '^19.0.0',
    },
    devDependencies: {
      '@types/node': '^20',
      '@types/react': '^19',
      '@types/react-dom': '^19',
      typescript: '^5',
      tailwindcss: '^4',
      '@tailwindcss/postcss': '^4',
    },
  }, null, 2);

  // next.config.ts
  files['next.config.ts'] = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
`;

  // tsconfig.json
  files['tsconfig.json'] = JSON.stringify({
    compilerOptions: {
      target: 'ES2017',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: { '@/*': ['./src/*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  }, null, 2);

  // postcss.config.mjs
  files['postcss.config.mjs'] = `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`;

  // src/app/layout.tsx
  files['src/app/layout.tsx'] = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${projectName}",
  description: "Built with Code Companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
`;

  // src/app/globals.css
  files['src/app/globals.css'] = code['globals.css'] || `@import "tailwindcss";

:root {
  --background: #09090b;
  --foreground: #fafafa;
}

body {
  color: var(--foreground);
  background: var(--background);
}
`;

  // src/app/page.tsx - the generated code
  files['src/app/page.tsx'] = code['page.tsx'];

  return files;
}

export async function POST(req: Request) {
  try {
    const { code, projectName } = await req.json() as DeployRequest;

    if (!process.env.VERCEL_TOKEN) {
      return NextResponse.json(
        { error: 'Vercel token not configured' },
        { status: 500 }
      );
    }

    // Generate all project files
    const files = generateProjectFiles(code, projectName);

    // Convert to Vercel's file format
    const vercelFiles = Object.entries(files).map(([path, content]) => ({
      file: path,
      data: Buffer.from(content).toString('base64'),
      encoding: 'base64',
    }));

    // Create deployment via Vercel API
    const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        files: vercelFiles,
        target: 'production',
        projectSettings: {
          framework: 'nextjs',
          installCommand: 'npm install',
          buildCommand: 'npm run build',
          outputDirectory: '.next',
        },
      }),
    });

    if (!deployResponse.ok) {
      const errorData = await deployResponse.json();
      console.error('Vercel deploy error:', errorData);
      return NextResponse.json(
        { error: errorData.error?.message || 'Deployment failed' },
        { status: 500 }
      );
    }

    const deployData = await deployResponse.json();

    // Wait for deployment to be ready (poll status)
    const deploymentUrl = `https://${deployData.url}`;
    
    // Poll for ready state (max 60 seconds)
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(
        `https://api.vercel.com/v13/deployments/${deployData.id}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
          },
        }
      );
      
      const statusData = await statusResponse.json();
      
      if (statusData.readyState === 'READY') {
        return NextResponse.json({
          success: true,
          url: deploymentUrl,
          deploymentId: deployData.id,
        });
      }
      
      if (statusData.readyState === 'ERROR') {
        return NextResponse.json(
          { error: 'Deployment failed during build' },
          { status: 500 }
        );
      }
      
      attempts++;
    }

    // Return URL even if still building
    return NextResponse.json({
      success: true,
      url: deploymentUrl,
      deploymentId: deployData.id,
      note: 'Deployment may still be building',
    });

  } catch (error) {
    console.error('Deploy error:', error);
    return NextResponse.json(
      { error: 'Failed to deploy' },
      { status: 500 }
    );
  }
}
