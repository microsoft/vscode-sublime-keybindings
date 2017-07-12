const vscode = require('vscode');

const showInformationMessage = vscode.window.showInformationMessage;
const isGlobalConfigValue = true;

class Setting {
    constructor(name, value) {
        this.name = name;
        this.value = value;
    }
}

const versionThreeSettings = [
    new Setting('multiCursorModifier', 'ctrlCmd'),
    new Setting('snippetSuggestions', 'top'),
    new Setting('formatOnPaste', true)
];

function updateSettings(editorConfig, settings) {
    settings.forEach((setting) => {
        editorConfig.update(setting.name, setting.value, isGlobalConfigValue);
    });
}

function isDefaultValueSet(editorConfig, settings) {
    for (var i = 0; i < settings.length; i++) {
        var setting = editorConfig.inspect(settings[i].name);
        const dv = setting ? setting.defaultValue : null;
        const gv = setting ? setting.globalValue : null;

        if (gv === dv || gv === undefined) {
            return true;
        }
    }

    return false;
}

class VersionThreeUpdateSetting {
    constructor() {
        this.name = 'promptV3Features';
        this.config = vscode.workspace.getConfiguration('sublimeTextKeymap');
        this.hasPrompted = this.config.get(this.name) || false;
    }

    persist() {
        this.config.update(this.name, true, isGlobalConfigValue);
    }

}

class View {

    constructor(updateSetting, editorConfig) {
        this.updateSetting = updateSetting;
        this.editorConfig = editorConfig;
        this.messages = {
            yes: 'Yes',
            no: 'No',
            learnMore: 'Learn More',
            prompt: 'New features are available for Sublime Text Keymap 3.0. Do you want to enable the new features?',
            noChange: 'Sublime Text Keymap: New features have not been enable.',
            change: 'Sublime Text Keymap: New features have been added.',
        };
    }

    showMessage() {
        const answer = showInformationMessage(this.messages.prompt, this.messages.yes, this.messages.no, this.messages.learnMore);
        
        answer.then((selectedOption) => {
            
            if (selectedOption === this.messages.yes) {
                this.updateSetting.persist();
                updateSettings(this.editorConfig, versionThreeSettings);
                showInformationMessage(this.messages.change);
            } else if (selectedOption === this.messages.no) {
                this.updateSetting.persist();
                showInformationMessage(this.messages.noChange);
            } else if (selectedOption === this.messages.learnMore) {
                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=ms-vscode.sublime-keybindings'));
            }
        });
    }
}

const activate = () => {
    // const editorConfig = vscode.workspace.getConfiguration('editor');
    // const updateSetting = new VersionThreeUpdateSetting();

    // if (!updateSetting.hasPrompted && isDefaultValueSet(editorConfig, versionThreeSettings)) {
    //     new View(updateSetting, editorConfig).showMessage();
    // }
}

module.exports = { activate };
