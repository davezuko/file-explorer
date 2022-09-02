import "./file-explorer.css"
import {useEffect, useMemo, useRef, useState} from "react"
import {observer} from "mobx-react-lite"
import {FSItem, Directory, FSViewModel, seedDirectory} from "./file-system"
import {FileTree} from "./file-tree"
import {DirectoryView} from "./directory-view"

export let FileExplorer = ({root}: {root: Directory}) => {
    const view = useMemo(() => new FSViewModel(root), [root])
    const [createDialog, setCreateDialog] = useState<FSItem["type"] | false>(
        false,
    )
    return (
        <div className="file-explorer">
            <header>
                <button onClick={() => setCreateDialog("file")}>
                    new file
                </button>
                <button onClick={() => setCreateDialog("directory")}>
                    new directory
                </button>
                <button onClick={() => seedDirectory(root, 100)}>
                    demo (100)
                </button>
                <button onClick={() => seedDirectory(root, 10_000)}>
                    demo (10,000)
                </button>
            </header>
            <div className="file-explorer-body">
                <FileTree view={view} />
                <DirectoryView view={view} />
            </div>
            {createDialog && (
                <CreateFSItemDialog
                    initialType={createDialog}
                    view={view}
                    onClose={() => setCreateDialog(false)}
                />
            )}
        </div>
    )
}
FileExplorer = observer(FileExplorer)

const CreateFSItemDialog = ({
    initialType,
    onClose,
    view,
}: {
    initialType: FSItem["type"]
    view: FSViewModel
    onClose(): void
}) => {
    const inputRef = useRef<HTMLInputElement>(null!)
    const formRef = useRef<HTMLFormElement>(null!)
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
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose()
            }
        }
        document.addEventListener("keydown", handleKeydown)
        return () => {
            document.removeEventListener("keydown", handleKeydown)
        }
    }, [])

    return (
        <div
            style={{
                position: "absolute",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                width: "100%",
                background: "rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => {
                if (!formRef.current?.contains(e.target as any)) {
                    onClose()
                }
            }}
        >
            <form
                ref={formRef}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "1rem",
                    background: "#fff",
                    width: "75%",
                    minWidth: "10rem",
                    maxWidth: "20rem",
                }}
                onSubmit={(e) => {
                    e.preventDefault()
                    view.create(type, name)
                    onClose()
                }}
            >
                <label>
                    Create new...
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

                <button type="submit">Create</button>
            </form>
        </div>
    )
}
