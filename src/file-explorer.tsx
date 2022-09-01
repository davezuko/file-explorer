import "./file-explorer.css"
import {useCallback, useMemo} from "react"
import {observer} from "mobx-react-lite"
import {Directory, FSItem, FSViewModel} from "./file-system"
import {Virtualizer} from "./virtualizer"

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

let FileTree = ({view}: {view: FSViewModel}) => {
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

let DirectoryView = ({view}: {view: FSViewModel}) => {
    const renderItem = useCallback((row: FSItem[]) => {
        return (
            <div key={row[0].name} style={{display: "flex"}}>
                {row.map((item) => {
                    return <DirectoryViewItem key={item.name} item={item} />
                })}
            </div>
        )
    }, [])

    const columns = 9 // TODO: compute based on available space
    const rows = useMemo(() => {
        const rows: FSItem[][] = []
        let row: FSItem[] = []
        for (let i = 0; i < view.cwd.children.length; i++) {
            row.push(view.cwd.children[i])
            if (row.length === columns) {
                rows.push(row)
                row = []
            }
        }
        if (row.length) {
            rows.push(row)
        }
        return rows
    }, [columns])

    return (
        <div style={{flex: 1}}>
            <Virtualizer
                items={rows}
                itemHeight={80} // TODO: update once I know the size
                renderItem={renderItem}
            />
        </div>
    )
}
DirectoryView = observer(DirectoryView)

let DirectoryViewItem = ({item}: {item: FSItem}) => {
    return (
        <div>
            <span>{item.name}</span>
        </div>
    )
}
DirectoryViewItem = observer(DirectoryViewItem)
