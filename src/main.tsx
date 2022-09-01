import "./main.css"
import {createRoot} from "react-dom/client"
import {Directory, File} from "./file-system"
import {FileExplorer} from "./file-explorer"
import {Desktop, WindowManager} from "./desktop-sim"

const main = () => {
    const dir = new Directory("root")
    dir.add(new File("File 1"))
    dir.add(new File("File 2"))
    dir.add(new File("File 3"))
    dir.add(new Directory("Directory 1"))
    dir.add(new Directory("Directory 2"))
    dir.add(new Directory("Directory 3"))
    dir.add(new File("File 4"))
    dir.add(new File("File 5"))
    dir.add(new File("File 6"))

    const wm = new WindowManager()
    wm.createWindow(<FileExplorer root={dir} />)

    const root = createRoot(document.getElementById("root")!)
    root.render(<Desktop windows={wm} />)
}

main()
