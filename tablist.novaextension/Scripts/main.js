
var treeView = null;
var treeTabs = null;
var interval = null;

function create_treeView() {
    
    // Create the TreeView
    treeView = new TreeView("tablist", {
        dataProvider: new TabListProvider()
    });
    
    treeView.onDidChangeSelection((selection) => {
        // console.log("New selection: " + selection.map((e) => e.name));
        nova.workspace.openFile(selection.map((e) => e.uri));
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

exports.activate = function() {
    
    // Do work when the extension is activated
    create_treeView();
    
    // REFRESH TREE ON FILE OPEN AND CLOSE
    nova.workspace.onDidAddTextEditor((editor) => {
        
        if ( treeView != null && treeTabs.length != nova.workspace.textDocuments.length ) {
            create_treeView();
        }
        
        editor.onDidDestroy(destroyedEditor => {
            
            let anotherEditor = nova.workspace.textEditors.find(editor => {
                return editor.document.uri === destroyedEditor.document.uri;
            });
            
            //console.log(destroyedEditor.document.uri);
            
            setTimeout(function(){ create_treeView(); }, 1000);
            
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
        create_treeView();
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
        
        this.uri = uri;
        this.name = uri.substring(uri.lastIndexOf('/')+1);
        this.extension = this.name.substring(this.name.lastIndexOf('.')+1);
        //this.parent = null;
        //this.children = [];
        
    }
    
}

class TabListProvider {

    constructor() {
        
        let rootItems = [];
        this.createTabTree();
        
    }
    
    createTabTree() {
        
        let rootItems = [];
        
        for ( let i=0; i < nova.workspace.textDocuments.length; i++ ) {
            
            let tabelement = new TabFile(nova.workspace.textDocuments[i].uri);
            
            rootItems.push(tabelement);
            
        }
        
        // ARRAY SORT
        rootItems.sort(this.sortByFileName);
        
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
        
        item.image = "__filetype."+element.extension;
        //item.command = "tablist.doubleClick";
        item.tooltip = decodeURI(element.uri.replace(/^.*?\/Users\//g,'/Users/'));
        item.contextValue = "info";
        
        return item;
        
    }
    
    sortByFileName(a, b) {
        
        a = nova.path.basename(a['uri']).toLowerCase();
        b = nova.path.basename(b['uri']).toLowerCase();
        
        return a > b ? 1 : b > a ? -1 : 0;   
        
    }
    
}