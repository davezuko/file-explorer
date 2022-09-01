import {useCallback} from "react"
import {observer} from "mobx-react-lite"
import {FSItem, FSViewModel} from "./file-system"
import {Virtualizer} from "./virtualizer"

export let FileTree = ({view}: {view: FSViewModel}) => {
    const renderItem = useCallback((item: FSItem) => {
        return <FileTreeItem key={item.name} item={item} />
    }, [])
    return (
        <div className="file-tree">
            <Virtualizer
                items={view.cwd.children}
                itemHeight={30} // TODO: update once I know the size
                renderItem={renderItem}
            />
        </div>
    )
}
FileTree = observer(FileTree)

let FileTreeItem = ({item}: {item: FSItem}) => {
    return (
        <div
            role="treeitem"
            // TODO
            aria-posinset={0}
            aria-selected={false}
            aria-level={0}
        >
            {item.name}
        </div>
    )
}
FileTreeItem = observer(FileTreeItem)
