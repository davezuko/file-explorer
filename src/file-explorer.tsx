import {useEffect, useMemo, useRef, useState, Fragment} from "react"
import {observer} from "mobx-react-lite"
import {
    FSItem,
    Directory,
    FSViewModel,
    seedDirectory,
    parents,
} from "./file-system"
import {FileTree} from "./file-tree"
import {DirectoryView} from "./directory-view"
import {Button, HStack, VStack} from "./primitives"
import {useWindowContext, useWindowDetails, useWindowTitle} from "./desktop-sim"

export let FileExplorer = ({root}: {root: Directory}) => {
    const view = useMemo(() => new FSViewModel(root), [root])
    const items = view.cwd.children.length
    useWindowTitle("File Explorer", view.cwd.name)
    useWindowDetails(`${items} ${items === 1 ? "item" : "items"}`)
    useEffect(() => {
        view.selection.clear()
    }, [view.cwd])

    return (
        <>
            <FileExplorerToolbar view={view} />
            <HStack flex={1}>
                <FileTree view={view} />
                <DirectoryView view={view} />
            </HStack>
        </>
    )
}
FileExplorer = observer(FileExplorer)

const FileExplorerToolbar = ({view}: {view: FSViewModel}) => {
    const win = useWindowContext()!
    const create = (type: FSItem["type"]) => {
        win.openDialog(
            "Create new...",
            <CreateItemForm
                view={view}
                initialType={type}
                onSubmit={(item) => {
                    // Spec: "The current selected directory is the parent" when
                    // creating a new file/directory. This is a bit awkward since
                    // the file tree supports multi-selection (not part of the
                    // base spec), so compromise by:
                    //
                    // 1. If only one item is selected and it's a directory, use
                    //    that as the parent.
                    // 2. Otherwise, use the cwd.
                    //
                    // TODO: the best solution would be to make the parent
                    // editable in the creation dialog.
                    const parent =
                        view.selection.size === 1 &&
                        view.selection.latest?.type === "directory"
                            ? view.selection.latest
                            : view.cwd

                    parent.add(item)
                    win.closeDialog()
                }}
            />,
        )
    }
    return (
        <VStack gap={1} style={{padding: "0.25rem"}}>
            <HStack gap={0.5}>
                <Button text="+ File" onClick={() => create("file")} />
                <Button text="+ Folder" onClick={() => create("directory")} />
                <Button
                    text="+ 100"
                    onClick={() => seedDirectory(view.cwd, 100)}
                />
                <Button
                    text="+ 10,000"
                    onClick={() => seedDirectory(view.cwd, 10_000)}
                />
                <Button
                    text="Help"
                    onClick={() => win.openDialog("Help", <Help />)}
                />
            </HStack>
            <LocationEditor view={view} />
        </VStack>
    )
}

const LocationEditor = ({view}: {view: FSViewModel}) => {
    const path = [...parents(view.cwd), view.cwd]
    return (
        <HStack gap={1} align="center" style={{marginLeft: "0.25rem"}}>
            <span>Location:</span>
            <HStack gap={0.5} align="center">
                {path.map((dir, idx) => {
                    return (
                        <Fragment key={dir.path}>
                            {idx !== 0 && (
                                <span style={{margin: "0 0.25rem"}}>{">"}</span>
                            )}
                            <Button onClick={() => (view.cwd = dir)}>
                                {dir.name}
                            </Button>
                        </Fragment>
                    )
                })}
            </HStack>
        </HStack>
    )
}

const Help = () => {
    return <div>TODO</div>
}

const CreateItemForm = ({
    view,
    initialType = "file",
    onSubmit,
}: {
    view: FSViewModel
    initialType?: FSItem["type"]
    onSubmit(item: FSItem): void
}) => {
    const inputRef = useRef<HTMLInputElement>(null!)
    const mountedRef = useRef(false)
    const [name, setName] = useState("")
    const [type, setType] = useState<FSItem["type"]>(initialType)

    const validate = () => {
        const input = inputRef.current
        if (!name.trim()) {
            input.setCustomValidity("Name is required.")
        } else if (!view.isNameAvailable(name)) {
            input.setCustomValidity(
                "A file or directory with this name already exists.",
            )
        } else {
            input.setCustomValidity("")
        }
        input.reportValidity()
    }

    useEffect(() => {
        if (mountedRef.current) {
            validate()
        }
    }, [name, mountedRef])

    useEffect(() => {
        mountedRef.current = true
        inputRef.current.focus()
    }, [mountedRef])

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault()
                onSubmit(view.create(type, name))
            }}
        >
            <VStack gap={2}>
                <label>
                    Type
                    <select
                        name="type"
                        value={type}
                        style={{display: "block", width: "100%"}}
                        onChange={(e) => {
                            setType(e.target.value as FSItem["type"])
                        }}
                    >
                        <option value="file">File</option>
                        <option value="directory">Directory</option>
                    </select>
                </label>
                <label>
                    Name
                    <input
                        ref={inputRef}
                        name="name"
                        value={name}
                        placeholder={
                            type === "file" ? "New File" : "New Directory"
                        }
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={{display: "block", width: "100%"}}
                    />
                </label>
                <Button type="submit" style={{marginTop: "0.5rem"}}>
                    Create
                </Button>
            </VStack>
        </form>
    )
}

export const FileIcon = ({
    item,
    ...rest
}: JSX.IntrinsicElements["img"] & {item: FSItem}) => {
    const [error, setError] = useState(false)
    useEffect(() => {
        setError(false)
    }, [item])

    let src =
        item.type === "directory"
            ? "/img/icon-directory.png"
            : `/img/icon-file-${item.ext}.png`

    if (error) {
        src = "/img/icon-file-unknown.png"
    }

    return <img src={src} onError={() => setError(true)} {...rest} />
}
