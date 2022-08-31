import esbuild from "esbuild"
import {config} from "../esbuild.config.js"

const main = async () => {
    const server = await esbuild.serve(
        {
            servedir: "static",
            port: 3000,
        },
        {
            ...config.esbuild,
            minify: false,
            splitting: true,
            outdir: "static/assets",
            sourcemap: "linked",
        },
    )
    console.log("server running at http://localhost:%s", server.port)
}

main()
