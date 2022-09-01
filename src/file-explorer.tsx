import "./file-explorer.css"
import {useMemo} from "react"
import {observer} from "mobx-react-lite"
import {Directory, FSViewModel} from "./file-system"
import {FileTree} from "./file-tree"
import {DirectoryView} from "./directory-view"

export let FileExplorer = ({root}: {root: Directory}) => {
    const view = useMemo(() => new FSViewModel(root), [root])
    return (
        <div className="file-explorer">
            <FileTree view={view} />
            <DirectoryView view={view} />
        </div>
    )
}
FileExplorer = observer(FileExplorer)
