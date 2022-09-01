import "preact/debug"
import "./main.css"
import {createRoot} from "react-dom/client"
import {Directory} from "./file-system"
import {FileExplorer} from "./file-explorer"
import {Desktop, WindowManager} from "./desktop-sim"

const main = () => {
    const dir = new Directory("root")
    const wm = new WindowManager()
    wm.createWindow(<FileExplorer root={dir} />)

    const root = createRoot(document.getElementById("root")!)
    root.render(<Desktop windows={wm} />)
}

main()
