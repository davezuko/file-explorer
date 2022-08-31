import http from "http"
import connect from "connect"
import compression from "compression"
import serveStatic from "serve-static"

const main = async () => {
    const app = connect()
    app.use(compression())
    app.use(serveStatic("./dist"))

    const server = http.createServer(app)
    server.listen(3000, () => {
        console.log("server running at http://localhost:3000")
    })
}

main()
