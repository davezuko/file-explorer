import "./file-tree.css"
import {useCallback, useMemo} from "react"
import {observer} from "mobx-react-lite"
import {FSViewModel} from "./file-system"
import {Virtualizer, FSTreeItem, FSTreeVirtualizer} from "./virtualizer"
import {cx, HStack} from "./primitives"

export let FileTree = ({view}: {view: FSViewModel}) => {
    const virtualizer = useMemo(() => new FSTreeVirtualizer(view), [view])
    const renderItem = useCallback(
        (item: FSTreeItem, style: React.CSSProperties) => {
            return <FileTreeItem {...item} view={view} style={style} />
        },
        [view],
    )
    return (
        <div
            tabIndex={0}
            className="file-tree panel"
            onKeyDown={(e) => {
                if (e.ctrlKey && e.key === "a") {
                    e.preventDefault()
                    view.selection.selectRange(
                        view.cwd.children,
                        0,
                        Infinity,
                        true,
                    )
                } else if (e.key === "Delete") {
                    view.deleteSelection()
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
    style,
}: FSTreeItem & {view: FSViewModel; style: React.CSSProperties}) => {
    const selected = view.selected(item)
    const expanded = view.expanded(item)
    const prefix = () => {
        if (item.type === "file") {
            return (
                <img
                    className="file-tree-item-prefix"
                    style={{padding: "2px"}}
                    src="/img/icon-file-txt.png"
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
            style={{...style, "--depth": depth} as React.CSSProperties}
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
                view.selection.fromClickEvent(
                    view.cwd.children,
                    item,
                    e.nativeEvent,
                )
            }}
        >
            {prefix()}
            {item.name}
        </HStack>
    )
}
FileTreeItem = observer(FileTreeItem)
