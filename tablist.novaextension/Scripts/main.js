
var treeView = null;
var treeTabs = null;
var interval = null;
var grouped = false;

const config = {
    grouped: false
};

function create_treeView(grouped) {
    
    // Create the TreeView
    treeView = new TreeView("tablist", {
        dataProvider: new TabListProvider()
    });
    
    treeView.onDidChangeSelection((selection) => {
        if ( (grouped === true && selection.map((e) => e.rootnode) == 'false') || grouped === false ) {
            nova.workspace.openFile(selection.map((e) => e.uri));
        }
    });
    
    treeView.onDidExpandElement((element) => {
        // console.log("Expanded: " + element.name);
    });
    
    treeView.onDidCollapseElement((element) => {
        // console.log("Collapsed: " + element.name);
    });
    
    treeView.onDidChangeVisibility(() => {
        // console.log("Visibility Changed");
    });
    
    // TreeView implements the Disposable interface
    nova.subscriptions.add(treeView);

}

function updateConfigFromWorkspace(newVal) {
    const key = this;
    if (newVal === null) {
        config[key] = nova.config.get("gerardojbueno.tablist.config."+key);
    } else {
        config[key] = newVal;
    }
}

function updateConfigFromGlobal(newVal) {
    const key = this;
    const workspaceConfig = nova.workspace.config.get("gerardojbueno.tablist.workspace."+key);
    if (workspaceConfig === null) {
        config[key] = newVal;
    }
}

exports.activate = function() {
    
    Object.keys(config).forEach(key => {
        
        config[key] = nova.workspace.config.get("gerardojbueno.tablist.workspace."+key);
        if (config[key] === null) {
            config[key] = nova.config.get("gerardojbueno.tablist.config."+key);
        }
        
        if ( key == 'grouped' ) {
            grouped = config[key];
        }
        
        nova.workspace.config.onDidChange("gerardojbueno.tablist.workspace."+key, updateConfigFromWorkspace, key);
        nova.config.onDidChange("gerardojbueno.tablist.config."+key, updateConfigFromGlobal, key);
        
    });
    
    // Do work when the extension is activated
    create_treeView(config.grouped);
    
    // REFRESH TREE ON FILE OPEN AND CLOSE
    nova.workspace.onDidAddTextEditor((editor) => {
        
        if ( treeView != null && treeTabs.length != nova.workspace.textDocuments.length ) {
            create_treeView(grouped);
        }
        
        editor.onDidDestroy(destroyedEditor => {
            
            let anotherEditor = nova.workspace.textEditors.find(editor => {
                return editor.document.uri === destroyedEditor.document.uri;
            });
            
            setTimeout(function(){ create_treeView(grouped); }, 1000);
            
        });
        
    });
    
}

exports.deactivate = function() {
    
    // Clean up state before the extension is deactivated
    treeView = null;
    treeTabs = null;
    
    if (interval !== null) {
        clearInterval(interval);
    }
    //interval = null;
    
}

nova.commands.register("tablist.refresh", () => {
    
    // Invoked when the "add" header button is clicked
    
    if (treeView != null) {
        create_treeView(grouped);
    }
    
});

nova.commands.register("tablist.grouped", () => {
    
    if ( grouped ) {
        grouped = false;
    } else {
        grouped = true;
    }
    
    // Invoked when the "add" header button is clicked
    
    if (treeView != null) {
        create_treeView(grouped);
    }
    
});

/* DOUBLE CLICK DISABLED
nova.commands.register("tablist.doubleClick", () => {
    // Invoked when an item is double-clicked
    let selection = treeView.selection;
    
    nova.workspace.openFile(selection.map((e) => e.uri));
    
});
*/

class TabFile {
    
    constructor(uri) {
        
        this.rootnode = true;
        this.uri = uri;
        this.name = decodeURIComponent(uri.substring(uri.lastIndexOf('/')+1));
        this.extension = this.name.substring(this.name.lastIndexOf('.')+1);
        this.parent = null;
        this.children = [];
        
    }
    
    addChild(element) {
        element.parent = this;
        element.rootnode = false;
        this.children.push(element);
    }
    
}

class TabListProvider {

    constructor() {
        
        let rootItems = [];
        this.createTabTree();
        
    }
    
    createTabTree() {
        
        let rootItems = [];
        let rootItem = [];
        let found = false;
        
        for ( let i=0; i < nova.workspace.textDocuments.length; i++ ) {
            
            let tabelement = new TabFile(nova.workspace.textDocuments[i].uri);
            
            if ( grouped ) {
                
                found = false;
                
                for ( let i = 0; i < rootItems.length; i++ ) {
                    
                    if ( rootItems[i].extension == tabelement.extension ) {
                        
                        found = true;
                        rootItems[i].addChild(tabelement);
                        
                        break;
                        
                    }
                    
                }
                
                if ( !found ) {
                    
                    rootItem = new TabFile('/file.'+tabelement.extension);
                    rootItems.push(rootItem);
                    
                    rootItems[rootItems.length - 1].addChild(tabelement);
                }
                
            } else {
                
                rootItems.push(tabelement);
                
            }
            
        }
        
        // ARRAY SORT
        rootItems.sort(this.sortByFileName);
        
        if ( grouped ) {
            for ( let i = 0; i < rootItems.length; i++ ) {
                rootItems[i].children.sort(this.sortByFileName);
            }
        }
        
        this.rootItems = rootItems;
        treeTabs = rootItems;
        
    }
    
    
    getChildren(element) {
        
        // Requests the children of an element
        if (!element) {
            return this.rootItems;
        }
        else {
            return element.children;
        }
        
    }
    
    getParent(element) {
        
        // Requests the parent of an element, for use with the reveal() method
        return element.parent;
        
    }
    
    getTreeItem(element) {
        
        // Converts an element into its display (TreeItem) representation
        let item = new TreeItem(element.name);
        
        /*
        if (element.children.length > 0) {
            item.collapsibleState = TreeItemCollapsibleState.Collapsed;
            item.image = "__filetype.png";
            item.contextValue = "fruit";
        }
        else {
            item.image = "__filetype.txt";
            item.command = "tablist.doubleClick";
            item.contextValue = "info";
        }
        */
        
        if ( element.children.length > 0 ) {
            
            item.name = item.name.replace(/^file\./g,'');
            item.collapsibleState = TreeItemCollapsibleState.Expanded;
            item.image = "__filetype."+element.extension;
            //item.command = "tablist.doubleClick";
            item.tooltip = 'node';
            item.contextValue = "info";
            item.descriptiveText  = "(" + element.children.length + ")";
            
        } else {
            
            item.image = "__filetype."+element.extension;
            //item.command = "tablist.doubleClick";
            item.tooltip = decodeURI(element.uri.replace(/^.*?\/Users\//g,'/Users/'));
            item.contextValue = "info";
            
        }
        
        return item;
        
    }
    
    sortByFileName(a, b) {
        
        a = nova.path.basename(a['uri']).toLowerCase();
        b = nova.path.basename(b['uri']).toLowerCase();
        
        return a > b ? 1 : b > a ? -1 : 0;   
        
    }
    
}