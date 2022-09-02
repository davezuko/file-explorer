import "./file-tree.css"
import {useCallback, useMemo} from "react"
import {observer} from "mobx-react-lite"
import {FSTreeItem, FSTreeVirtualizer, FSViewModel} from "./file-system"
import {Virtualizer} from "./virtualizer"
import {computed} from "mobx"
import {cx} from "./primitives"

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
        <div className="file-tree panel">
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
    const selected = computed(() => view.selected(item)).get()
    return (
        <div
            className={cx("file-tree-item selectable", selected && "selected")}
            role="treeitem"
            style={{...style, "--depth": depth} as React.CSSProperties}
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
            {item.type === "directory" ? "D" : "F"} {item.name}
        </div>
    )
}
FileTreeItem = observer(FileTreeItem)
