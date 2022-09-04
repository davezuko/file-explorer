## Get Started

Requirements:

-   node @ ^10.18.0
-   yarn ^1.10.1

```sh
# install dependencies
yarn install

# start dev server at http://localhost:3000
yarn start

# build to disk for production
yarn build

# serve the production build locally at http://localhost:3000
yarn serve
```

## Usage

Start the web app (`yarn start` or `yarn serve`) and visit http://localhost:3000. An empty file explorer is launched by default. At the top of the file explorer is a toolbar with these buttons:

-   **+ File**: Create a new file.
-   **+ Folder**: Create a new folder (directory).
-   **+ 100**: Insert 100 random items into the current directory.
-   **+ 10,000**: Insert 10,000 random items into the current directory.
-   **New Window**: Open a new window rooted at the current directory.

### Shortcuts

-   **Toggle selected**: <kbd>ctrl</kbd> + <kbd>click</kbd>
-   **Select range**: <kbd>shift</kbd> + <kbd>click</kbd>
-   **Select all**: <kbd>ctrl</kbd> + <kbd>a</kbd>
-   **Delete selection**: <kbd>Delete</kbd>

## Attributions

-   Based on: https://github.com/gianluca-venturini/express-react-webpack-starter
