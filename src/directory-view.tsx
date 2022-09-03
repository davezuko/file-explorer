import "./directory-view.css"
import {useCallback, useMemo} from "react"
import {observer} from "mobx-react-lite"
import {FSItem, FSViewModel} from "./file-system"
import {Virtualizer} from "./virtualizer"
import {cx, HStack, VStack} from "./primitives"

export let DirectoryView = ({view}: {view: FSViewModel}) => {
    const renderItem = useCallback(
        (row: FSItem[], style: React.CSSProperties) => {
            return (
                <HStack
                    key={row[0].name}
                    style={style}
                    gap={0.75}
                    className="directory-view-row"
                    align="start"
                >
                    {row.map((item) => {
                        return (
                            <DirectoryViewItem
                                key={item.name}
                                item={item}
                                view={view}
                            />
                        )
                    })}
                </HStack>
            )
        },
        [],
    )

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
    }, [columns, view.cwd.children, view.cwd.children.length])

    return (
        <div
            className="directory-view panel"
            onClick={(e) => {
                // the user can click on the canvas to clear the current
                // selection. Do not clear the selection if a modifier key
                // is pressed since that may just be a misclick.
                if (!e.ctrlKey && !e.shiftKey) {
                    view.selection.clear()
                }
            }}
        >
            <Virtualizer items={rows} itemHeight={75} renderItem={renderItem} />
        </div>
    )
}
DirectoryView = observer(DirectoryView)

let DirectoryViewItem = ({item, view}: {item: FSItem; view: FSViewModel}) => {
    const selected = view.selected(item)
    return (
        <VStack
            className={cx(
                "directory-view-item selectable",
                selected && "selected",
            )}
            onClick={(e) => {
                e.stopPropagation()
                view.selection.fromClickEvent(
                    view.cwd.children,
                    item,
                    e.nativeEvent,
                )
            }}
            onKeyDown={(e) => {
                if (selected && e.ctrlKey && e.key === "Delete") {
                    view.deleteSelection()
                }
            }}
            tabIndex={0}
        >
            <img className="directory-view-item-image" />
            <span className="directory-view-item-name truncate">
                {item.name}
            </span>
        </VStack>
    )
}
DirectoryViewItem = observer(DirectoryViewItem)
