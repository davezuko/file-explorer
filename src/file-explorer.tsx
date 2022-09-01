import "./file-explorer.css"
import {useMemo} from "react"
import {observer} from "mobx-react-lite"
import {Directory, FSViewModel, seedDirectory} from "./file-system"
import {FileTree} from "./file-tree"
import {DirectoryView} from "./directory-view"

export let FileExplorer = ({root}: {root: Directory}) => {
    const view = useMemo(() => new FSViewModel(root), [root])
    return (
        <div className="file-explorer">
            <header>
                <button onClick={() => seedDirectory(root, 100)}>
                    demo (100)
                </button>
                <button onClick={() => seedDirectory(root, 10_000)}>
                    demo (10,000)
                </button>
            </header>
            <div className="file-explorer-body">
                <FileTree view={view} />
                <DirectoryView view={view} />
            </div>
        </div>
    )
}
FileExplorer = observer(FileExplorer)
