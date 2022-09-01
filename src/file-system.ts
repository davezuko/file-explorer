import {makeAutoObservable, observable} from "mobx"

/**
 * FSItem represents all allowed items in a file system. It would be possible
 * to represent File and Directory as a single type, where File simply doesn't
 * have any children. However, splitting them into unique classes allows for
 * richer, type-specific APIs.
 */
export type FSItem = File | Directory

export class File {
    name: string
    type: "file"
    parent: Directory | null

    constructor(name: string) {
        this.name = name
        this.type = "file"
        this.parent = null
        makeAutoObservable(this, {
            type: false,
            parent: observable.ref,
        })
    }
}

export class Directory {
    name: string
    type: "directory"
    parent: Directory | null
    children: FSItem[]

    constructor(name: string) {
        this.name = name
        this.type = "directory"
        this.children = []
        this.parent = null
        makeAutoObservable(this, {
            type: false,
            parent: observable.ref,
            children: observable.shallow,
        })
    }

    add<T extends FSItem>(item: T): T {
        item.parent = this
        this.children.push(item)
        return item
    }
}

export class FSViewModel {
    cwd: Directory

    constructor(dir: Directory) {
        this.cwd = dir
        makeAutoObservable(this, {
            cwd: observable.ref,
        })
    }

    createFile(name = "New file"): File {
        const file = new File(name)
        this.cwd.add(file)
        return file
    }

    createDirectory(name = "New directory"): Directory {
        const directory = new Directory(name)
        this.cwd.add(directory)
        return directory
    }
}
