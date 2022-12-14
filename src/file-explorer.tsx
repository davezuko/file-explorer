import {useEffect, useMemo, useRef, useState, Fragment} from "react"
import {observer} from "mobx-react-lite"
import {
    FSItem,
    Directory,
    FSViewModel,
    seedDirectory,
    parents,
    isNameAvailable,
} from "./file-system"
import {FileTree} from "./file-tree"
import {DirectoryView} from "./directory-view"
import {Button, HStack, truncate, VStack} from "./primitives"
import {
    useWindowContext,
    useWindowDetails,
    useWindowManager,
    useWindowTitle,
} from "./desktop-sim"

export let FileExplorer = ({root}: {root: Directory}) => {
    const view = useMemo(() => new FSViewModel(root), [root])
    const items = view.cwd.children.length
    useWindowTitle("File Explorer", view.cwd.name)

    let details = ""
    if (!view.cwd.deleted) {
        details = `${items} ${items === 1 ? "item" : "items"}`
        const selected = view.selection.size
        if (selected > 0) {
            details += ` (${selected} selected)`
        }
    }
    useWindowDetails(details)

    if (view.cwd.deleted) {
        return (
            <VStack flex={1} align="center" justify="center" className="panel">
                <p>This directory has been removed.</p>
            </VStack>
        )
    }

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
    const wm = useWindowManager()

    const create = (type: FSItem["type"]) => {
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

        win.openDialog(
            `Create item in "${parent.name}"`,
            <CreateItemForm
                view={view}
                parent={parent}
                initialType={type}
                onSubmit={(item) => {
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
                    text="New Window"
                    onClick={() => {
                        wm.createWindow(<FileExplorer root={view.cwd} />)
                    }}
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
            <HStack gap={0.5} align="center" style={{overflow: "auto"}}>
                {path.map((dir, idx) => {
                    return (
                        <Fragment key={dir.path}>
                            {idx !== 0 && (
                                <span style={{margin: "0 0.15rem"}}>{"/"}</span>
                            )}
                            <Button onClick={() => (view.cwd = dir)}>
                                {truncate(dir.name, 15, {prefix: true})}
                            </Button>
                        </Fragment>
                    )
                })}
            </HStack>
        </HStack>
    )
}

const CreateItemForm = ({
    view,
    parent,
    initialType = "file",
    onSubmit,
}: {
    view: FSViewModel
    parent: Directory
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
        } else if (!isNameAvailable(parent, name)) {
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
            : `/img/icon-file-${lookupIcon(item.ext)}.png`

    // If the image failed to load, show the "unknown" icon rather
    // than a broken image.
    if (error) {
        src = "/img/icon-file-unknown.png"
    }

    return <img src={src} onError={() => setError(true)} {...rest} />
}

const lookupIcon = (ext: string): string => {
    switch (ext) {
        case "":
            return "unknown"
        case "ppt":
        case "xls":
        case "doc":
        case "docx":
            return "txt"
        case "lua":
        case "rb":
        case "py":
        case "js":
        case "json":
        case "jsx":
        case "ts":
        case "tsx":
            return "script"
        case "jpeg":
            return "jpg"
        case "wav":
        case "mp3":
            return "audio"
        case "mov":
        case "mp4":
        case "avi":
        case "flv":
        case "swf":
        case "webm":
            return "video"
        default:
            return ext
    }
}
