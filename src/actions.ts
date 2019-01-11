import * as vscode from "vscode";

export function duplicateAction(editor: vscode.TextEditor) {
    if (!hasActiveSelection(editor)) {
        vscode.commands.executeCommand("editor.action.copyLinesDownAction");
    } else {
        duplicateWithSelection(editor);
    }
}

function hasActiveSelection(editor: vscode.TextEditor): boolean {
    for (var i = 0; i < editor.selections.length; i++) {
        if (!editor.selections[i].isEmpty) {
            return true;
        }
    }
    return false;
}

function duplicateWithSelection(editor: vscode.TextEditor) {
    var sel = editor.selection;
    let text = editor.document.getText(sel)

    editor.edit(edit => {
        edit.insert(sel.active, text);
    }).then(() => {
        try {
            editor.selection = new vscode.Selection(sel.active, editor.selection.active);
        } catch (err) {
            console.log(err)
        }
    })
}