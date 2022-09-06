import "./file-tree.css"
import {useCallback, useMemo} from "react"
import {observer} from "mobx-react-lite"
import {FSViewModel} from "./file-system"
import {Virtualizer, FSTreeItem, FSTreeVirtualizer} from "./virtualizer"
import {cx, HStack} from "./primitives"
import {FileIcon} from "./file-explorer"
import {getClickIntent, getKeyboardIntent, SelectionIntent} from "./selection"

export let FileTree = ({view}: {view: FSViewModel}) => {
    const virtualizer = useMemo(() => new FSTreeVirtualizer(view), [view])
    const renderItem = useCallback(
        (item: FSTreeItem, {top}: {top: number}) => {
            return <FileTreeItem {...item} view={view} top={top} />
        },
        [view],
    )
    return (
        <div
            tabIndex={0}
            className="file-tree panel"
            onKeyDown={(e) => {
                switch (getKeyboardIntent(e.nativeEvent)) {
                    case SelectionIntent.SelectAll:
                        e.preventDefault()
                        view.selection.selectRange(
                            view.cwd.children,
                            0,
                            Infinity,
                        )
                        break
                    case SelectionIntent.Delete:
                        view.deleteSelection()
                        break
                }
            }}
        >
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
    setSize,
    posInSet,
    view,
    top,
    items: treeItems,
    index,
}: FSTreeItem & {view: FSViewModel; top: number}) => {
    const selected = view.selected(item)
    const expanded = view.expanded(item)
    const prefix = () => {
        if (item.type === "file") {
            return (
                <FileIcon
                    item={item}
                    className="file-tree-item-prefix"
                    style={{padding: "2px"}}
                />
            )
        }
        return (
            <button
                className="file-tree-item-prefix"
                onClick={(e) => {
                    e.stopPropagation()
                    view.toggleExpanded(item)
                }}
                style={{transform: expanded ? "rotate(90deg)" : ""}}
            >
                {">"}
            </button>
        )
    }

    return (
        <HStack
            align="center"
            className={cx("file-tree-item selectable", selected && "selected")}
            role="treeitem"
            style={{"--depth": depth, top: top + "px"} as React.CSSProperties}
            tabIndex={0}
            aria-label={item.name}
            aria-setsize={setSize}
            aria-posinset={posInSet}
            aria-selected={selected}
            aria-level={depth + 1}
            {...(item.type === "directory" && {
                "aria-expanded": expanded,
            })}
            onClick={(e) => {
                switch (getClickIntent(e.nativeEvent)) {
                    case SelectionIntent.SelectRange: {
                        // We can't just select a range of indices from the cwd
                        // since we may be rendering expanded child directories.
                        // Instead, select from the virtualized items.
                        const items = treeItems.map((ti) => ti.item)
                        const start = index
                        const end = items.indexOf(view.selection.latest!)
                        view.selection.selectRange(items, start, end, true)
                        break
                    }
                    case SelectionIntent.ToggleOne:
                        view.selection.toggle(item)
                        break
                    case SelectionIntent.SelectOne:
                        view.selection.selectOne(item)
                        break
                }
            }}
        >
            {prefix()}
            {item.name}
        </HStack>
    )
}
FileTreeItem = observer(FileTreeItem)
