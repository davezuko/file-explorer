import "./directory-view.css"
import {useCallback, useEffect, useMemo, useRef, useState} from "react"
import {observer} from "mobx-react-lite"
import {FSItem, FSViewModel} from "./file-system"
import {Virtualizer} from "./virtualizer"
import {cx, HStack, VStack} from "./primitives"
import {FileIcon} from "./file-explorer"
import {getKeyboardIntent, SelectionIntent} from "./selection"

// TODO: compute at render time.
const ITEM_WIDTH = 72
const ITEM_HEIGHT = 75

export let DirectoryView = ({view}: {view: FSViewModel}) => {
    const ref = useRef<HTMLDivElement>(null!)
    const [cols, gutter] = useAvailableColumns(ref, ITEM_WIDTH)
    const rows = useMemo(() => {
        const rows: FSItem[][] = []
        if (cols === 0) {
            return rows
        }

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
                    className="directory-view-row"
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
            style={{"--gutter": `${gutter}px`} as React.CSSProperties}
            onClick={(e) => {
                // the user can click on the canvas to clear the current
                // selection. Do not clear the selection if a modifier key
                // is pressed since that may just be a misclick.
                if (!e.ctrlKey && !e.shiftKey) {
                    view.selection.clear()
                }
            }}
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
): [number, number] => {
    const [columns, setColumns] = useState(0)
    const [gutter, setGutter] = useState(0)
    useEffect(() => {
        const ro = new ResizeObserver((entries) => {
            const rect = entries[0].contentRect
            const cols = Math.floor(rect.width / ITEM_WIDTH)
            setColumns(cols)
            setGutter((rect.width % cols) / 2)
        })
        ro.observe(ref.current)
        return () => {
            ro.disconnect()
        }
    }, [ref, width])
    return [columns, gutter]
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
                // Stop propagation because our parent is listening for
                // unhandled click events to clear the current selection.
                e.stopPropagation()

                // if a directory is double-clicked, open that dir. We don't
                // yet support opening files.
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
