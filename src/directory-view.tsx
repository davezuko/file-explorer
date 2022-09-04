import "./directory-view.css"
import {useCallback, useEffect, useMemo, useRef, useState} from "react"
import {observer} from "mobx-react-lite"
import {FSItem, FSViewModel} from "./file-system"
import {Virtualizer} from "./virtualizer"
import {cx, HStack, VStack} from "./primitives"
import {FileIcon} from "./file-explorer"

// TODO: compute at render time.
const ITEM_WIDTH = 72
const ITEM_HEIGHT = 75

export let DirectoryView = ({view}: {view: FSViewModel}) => {
    const ref = useRef<HTMLDivElement>(null!)
    const cols = useAvailableColumns(ref, ITEM_WIDTH)
    const rows = useMemo(() => {
        const rows: FSItem[][] = []
        let row: FSItem[] = []
        for (const item of view.cwd.children) {
            row.push(item)
            if (row.length === cols) {
                rows.push(row)
                row = []
            }
        }
        if (row.length) {
            rows.push(row)
        }
        return rows
    }, [cols, view.cwd.children, view.cwd.children.length])

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

    return (
        <div
            ref={ref}
            tabIndex={0}
            className="directory-view panel"
            onClick={(e) => {
                // the user can click on the canvas to clear the current
                // selection. Do not clear the selection if a modifier key
                // is pressed since that may just be a misclick.
                if (!e.ctrlKey && !e.shiftKey) {
                    view.selection.clear()
                }
            }}
            onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "a") {
                    e.preventDefault()
                    view.selection.selectRange(
                        view.cwd.children,
                        0,
                        Infinity,
                        true,
                    )
                } else if (e.key === "Delete" || e.key === "Backspace") {
                    view.deleteSelection()
                }
            }}
        >
            <Virtualizer
                items={rows}
                itemHeight={ITEM_HEIGHT}
                renderItem={renderItem}
            />
        </div>
    )
}
DirectoryView = observer(DirectoryView)

const useAvailableColumns = (
    ref: React.MutableRefObject<HTMLDivElement>,
    width: number,
): number => {
    const [columns, setColumns] = useState(0)
    useEffect(() => {
        const ro = new ResizeObserver((entries) => {
            const rect = entries[0].contentRect
            const cols = Math.floor(rect.width / ITEM_WIDTH)
            setColumns(cols)
        })
        ro.observe(ref.current)
        return () => {
            ro.disconnect()
        }
    }, [ref, width])
    return columns
}

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
                if (e.detail > 1) {
                    if (item.type === "directory") {
                        view.cwd = item
                    }
                } else {
                    view.selection.fromClickEvent(
                        view.cwd.children,
                        item,
                        e.nativeEvent,
                    )
                }
            }}
            tabIndex={0}
        >
            <FileIcon className="directory-view-item-image" item={item} />
            <span className="directory-view-item-name truncate">
                {item.name}
            </span>
        </VStack>
    )
}
DirectoryViewItem = observer(DirectoryViewItem)
