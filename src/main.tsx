import {createRoot} from "react-dom/client"
import {Directory, File} from "./file-system"
import {FileExplorer} from "./file-explorer"

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

    const root = createRoot(document.getElementById("root")!)
    root.render(<App root={dir} />)
}

const App = ({root}: {root: Directory}) => {
    return <FileExplorer root={root} />
}

main()
