#!/usr/bin/env node

import fs from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import childProcess from "node:child_process";
import prompts from "prompts";
import { stripIndent } from "common-tags";

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const exec = promisify(childProcess.exec);

(async () => {
  const response = await prompts([
    {
      type: "text",
      name: "projectName",
      message: "Name of the project:",
      initial: "rainsrc",
    },
    {
      type: "select",
      name: "packageManager",
      message: "Which package manager do you use:",
      choices: [
        { title: "npm", value: "npm" },
        { title: "yarn", value: "yarn" },
        { title: "pnpm", value: "pnpm" },
      ],
    },
    {
      type: "text",
      name: "mainFileName",
      message: "Name of the main file:",
      initial: "main",
    },
  ]);
  const { projectName, packageManager, mainFileName } = response;

  const gitignoreContent = stripIndent`
    dist/
    node_modules/
    .env
  `;
  const tsConfigContent = stripIndent`
    {
      "compilerOptions": {
        "target": "ES2017",
        "module": "ESNext",
        "declaration": true,
        "outDir": "./dist",
        "moduleResolution": "node",
        "esModuleInterop": true,
        "strict": true
      },
      "include": ["src/**/*"]
    }
  `;
  const envContent = stripIndent`
    import dotenv from "dotenv";
    import { cleanEnv } from "envalid";

    dotenv.config();

    const env = cleanEnv(process.env, {
    });

    export default env;
  `;
  console.log("Terminal Running");

  const workingDirectory = join(process.cwd(), projectName);
  await mkdir(workingDirectory);

  if (packageManager === "npm") {
    await exec("npm init -y", { cwd: workingDirectory });
  } else if (packageManager === "yarn") {
    await exec("yarn init -y", { cwd: workingDirectory });
  } else if (packageManager === "pnpm") {
    await exec("pnpm init", { cwd: workingDirectory });
  } else {
    return process.exit();
  }
  console.log("Creating files & folders");

  await Promise.all([
    writeFile(join(workingDirectory, ".gitignore"), gitignoreContent),
    writeFile(join(workingDirectory, "tsconfig.json"), tsConfigContent),
    writeFile(join(workingDirectory, ".env"), ""),

    mkdir(join(workingDirectory, "src")).then(() => {
      writeFile(join(workingDirectory, "src", `${mainFileName}.ts`), "");
      writeFile(join(workingDirectory, "src", "env.ts"), envContent);
    }),
  ]);
  await updatingPackageJson(workingDirectory, mainFileName);
  console.log("Rainsrc generated successfully");
})().catch(console.log);

async function updatingPackageJson(
  workingDirectory: string,
  mainFileName: string,
) {
  const path = join(workingDirectory, "package.json");
  const content = await readFile(path);
  const parsed = JSON.parse(content.toString());
  const newParsed = {
    ...parsed,
    type: "module",
    main: "dist/index.js",
    scripts: {
      dev: `yarn build && yarn start`,
      start: `node ./dist/${mainFileName}.js`,
      build: "tsc",
    },
    dependencies: {
      "dotenv": "^16.3.1",
      "envalid": "^8.0.0",
    },
    devDependencies: {
      "typescript": "^5.3.3",
      "prettier": "^3.2.3",
      "@types/node": "^20.11.5",
    },
  };
  const newContent = JSON.stringify(newParsed);
  await writeFile(path, newContent);
}
