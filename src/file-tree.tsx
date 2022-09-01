import "./file-tree.css"
import {useCallback, useMemo} from "react"
import {observer} from "mobx-react-lite"
import {FSTreeItem, FSTreeVirtualizer, FSViewModel} from "./file-system"
import {Virtualizer} from "./virtualizer"

export let FileTree = ({view}: {view: FSViewModel}) => {
    const virtualizer = useMemo(() => new FSTreeVirtualizer(view), [view])
    const renderItem = useCallback(
        ({item, depth}: FSTreeItem, style: React.CSSProperties) => {
            return (
                <FileTreeItem
                    key={item.name}
                    item={item}
                    depth={depth}
                    view={view}
                    style={style}
                />
            )
        },
        [view],
    )
    return (
        <div className="file-tree">
            <Virtualizer
                items={virtualizer.items}
                itemHeight={24}
                renderItem={renderItem}
            />
        </div>
    )
}
FileTree = observer(FileTree)

let FileTreeItem = ({
    item,
    depth,
    view,
    style,
}: FSTreeItem & {view: FSViewModel; style: React.CSSProperties}) => {
    return (
        <div
            role="treeitem"
            style={{...style, paddingLeft: depth * 1 + "rem"}}
            // TODO
            aria-posinset={0}
            aria-selected={false}
            aria-level={0}
            onClick={() => {
                if (item.type === "directory") {
                    view.toggleExpanded(item)
                }
            }}
        >
            {item.name}
        </div>
    )
}
FileTreeItem = observer(FileTreeItem)
