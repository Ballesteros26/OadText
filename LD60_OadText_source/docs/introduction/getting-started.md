# Getting Started

## Running the Development Server

Install the dependencies:

```shell
npm install
```

Afterward start the development server with

```shell
npm start
```

and open the provided url in a browser.

Changes of code and assets will be reflected in the browser directly by [Hot Module Replacement (HMR)](/build-setup/hmr).

## Entry Point

The code that runs in the browser starts at `src/index.ts`.

## Folder Structure

| Folder                 | Description                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| assets                 | Assets like logos that were **not** generated during the jam                                  |
| docs                   | The source code of the documentation you currently see                                        |
| engine                 | Contains the code and utilities that are documentated here                                    |
| eslint                 | Custom eslint rules                                                                           |
| src                    | Contains the source code and assets that get created during the jam                           |
| test                   | Unit tests                                                                                    |
| typescript-transformer | Transformers for [runtime modifications](/runtime-modifications/) and [HMR](/build-setup/hmr) |
| vite                   | Vite plugins                                                                                  |
