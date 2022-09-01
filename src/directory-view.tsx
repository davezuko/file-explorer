import {useCallback, useMemo} from "react"
import {observer} from "mobx-react-lite"
import {FSItem, FSViewModel} from "./file-system"
import {Virtualizer} from "./virtualizer"

export let DirectoryView = ({view}: {view: FSViewModel}) => {
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
