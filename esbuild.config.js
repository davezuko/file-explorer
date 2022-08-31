import path from "path"

const createConfig = () => {
    let enablePreact = true
    let enableDevtools = false

    const config = {
        esbuild: {
            entryPoints: {
                main: "./src/main",
            },
            outdir: "dist/assets",
            bundle: true,
            format: "esm",
            platform: "browser",
            target: "esnext",
            splitting: true,
            pure: [],
            plugins: [],
            define: {
                "process.env.NODE_ENV": JSON.stringify(
                    process.env.NODE_ENV || "development",
                ),
            },
        },
    }
    for (const arg of process.argv.slice(2)) {
        if (arg.startsWith("--devtools")) {
            enableDevtools = boolFlag(arg)
            continue
        }
        if (arg.startsWith("--minify")) {
            config.esbuild.minify = boolFlag(arg)
            continue
        }
        if (arg.startsWith("--react")) {
            enablePreact = !boolFlag(arg)
            continue
        }
    }
    if (enablePreact) {
        config.esbuild.plugins.push(
            esbuildPluginPreact({
                devtools: enableDevtools,
            }),
        )
    }
    return config
}

const boolFlag = (flag) => {
    const value = read_flag_value(flag)
    return value !== "0"
}

const read_flag_value = (flag) => {
    return flag.split("=")[1]
}

const esbuildPluginPreact = (options) => {
    return {
        name: "preact",
        setup(build) {
            if (!options.devtools) {
                build.onLoad(
                    {filter: /^preact\/debug$/, namespace: "preact/debug"},
                    () => {
                        return {contents: ""}
                    },
                )
                build.onResolve({filter: /^preact\/debug$/}, () => {
                    return {
                        path: "preact/debug",
                        namespace: "preact/debug",
                    }
                })
            }
            build.onResolve(
                {filter: /^(react|react-dom|preact\/compat)$/},
                (_args) => {
                    const dest = path.join(
                        process.cwd(),
                        "node_modules/preact/compat/dist/compat.module.js",
                    )
                    return {path: dest}
                },
            )
            build.onResolve({filter: /^(react\/jsx-runtime)$/}, (_args) => {
                const dest = path.join(
                    process.cwd(),
                    "node_modules/preact/compat/jsx-runtime.mjs",
                )
                return {path: dest}
            })
            build.onResolve({filter: /^(react-dom\/client)$/}, (_args) => {
                const dest = path.join(
                    process.cwd(),
                    "node_modules/preact/compat/client.mjs",
                )
                return {path: dest}
            })
        },
    }
}

export const config = createConfig()
