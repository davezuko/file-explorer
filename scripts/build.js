import fs from "fs"
import esbuild from "esbuild"
import {minify as minify_html} from "html-minifier-terser"
import {config} from "../esbuild.config.js"

const main = async () => {
    await fs.promises.rm("dist", {force: true, recursive: true})

    const minify = config.esbuild.minify ?? true
    const result = await esbuild.build({
        ...config.esbuild,
        minify,
        metafile: true,
        define: {
            ...config.esbuild.define,
            "process.env.NODE_ENV": JSON.stringify(
                process.env.NODE_ENV || "production",
            ),
        },
    })

    await fs.promises.cp("./static", "./dist", {recursive: true})

    if (minify) {
        const html_files = ["./dist/index.html"]
        for (const file of html_files) {
            const text = await fs.promises.readFile(file, "utf8")
            const minified = await minify_html(text, {
                minifyCSS: true,
                minifyJS: false,
                collapseWhitespace: true,
                removeComments: true,
            })
            await fs.promises.writeFile(file, minified, "utf8")
        }
    }

    const text = await esbuild.analyzeMetafile(result.metafile, {
        verbose: false,
    })
    console.info(text)
}

main()
