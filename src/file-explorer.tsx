import {useEffect, useMemo, useRef, useState} from "react"
import {observer} from "mobx-react-lite"
import {FSItem, Directory, FSViewModel, seedDirectory} from "./file-system"
import {FileTree} from "./file-tree"
import {DirectoryView} from "./directory-view"
import {Button, HStack, VStack} from "./primitives"
import {useWindowContext, useWindowDetails, useWindowTitle} from "./desktop-sim"

export let FileExplorer = ({root}: {root: Directory}) => {
    const view = useMemo(() => new FSViewModel(root), [root])
    const items = view.cwd.children.length
    useWindowTitle("File Explorer", view.cwd.name)
    useWindowDetails(`${items} ${items === 1 ? "item" : "items"}`)
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
    const win = useWindowContext()
    const create = (type: FSItem["type"]) => {
        win.openDialog(
            "Create new...",
            <CreateItemForm
                view={view}
                initialType={type}
                onClose={() => win.closeDialog()}
            />,
        )
    }
    return (
        <header>
            <HStack>
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
        </header>
    )
}

const Help = () => {
    return <div>TODO</div>
}

const CreateItemForm = ({
    initialType,
    onClose,
    view,
}: {
    initialType: FSItem["type"]
    view: FSViewModel
    onClose(): void
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
                view.create(type, name)
                onClose()
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
