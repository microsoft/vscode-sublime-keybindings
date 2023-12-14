import { resolve } from 'path';
import * as rjson from 'relaxed-json';
import * as vscode from 'vscode';
import { readFileAsync } from './fsWrapper';
import { ISetting, MappedSetting, CategorizedSettings, VscodeSetting } from './settings';

interface IConfigCheck {
    /** Key-Value pair already exists in user settings */
    readonly alreadyExists: boolean;
    /** Setting already exists in user settings but with a different value */
    readonly existingValue: string;
}

interface IMapperSettings {
    mappings: { [key: string]: any };
    defaults: VscodeSetting[];
}
export class Mapper {

    constructor(private settings?: IMapperSettings, private mockConfig?: any) { }

    public async getMappedSettings(sublimeSettings: string): Promise<CategorizedSettings> {
        const settingsMappings = await this.getSettings();
        let parsedSublimeSettings;
        try {
            parsedSublimeSettings = rjson.parse(sublimeSettings);
        } catch (e) {
            vscode.window.showErrorMessage(vscode.l10n.t('The sublime settings file could not be parsed. Please check if it contains syntax errors.'));
            throw (e);
        }
        return this.mapAllSettings(settingsMappings, parsedSublimeSettings);
    }

    private async getSettings(): Promise<IMapperSettings> {
        if (!this.settings) {
            // make sure set node: false in /build/node_extension.webpack.config.json so that __dirname is correct
            const [mappingsFile, defaultsFile] = await Promise.all([readFileAsync(resolve(__dirname, '..', 'settings/mappings.json'), 'utf-8'), 
                                                                    readFileAsync(resolve(__dirname, '..', 'settings/defaults.json'), 'utf-8')]);
            this.settings = {
                mappings: rjson.parse(mappingsFile),
                defaults: (rjson.parse(defaultsFile) as [[string, any]]).map((setting) => new VscodeSetting(setting[0], setting[1])),
            };
        }
        return this.settings;
    }

    private mapAllSettings(settings: IMapperSettings, sublimeSettings: { [key: string]: any }): CategorizedSettings {
        const analyzedSettings: CategorizedSettings = new CategorizedSettings();
        const config = this.mockConfig || vscode.workspace.getConfiguration();

        for (const sublimeKey of Object.keys(sublimeSettings)) {
            const sublimeSetting = { name: sublimeKey, value: sublimeSettings[sublimeKey] };
            const vscodeSetting = this.mapSetting(sublimeSetting, settings.mappings[sublimeKey]);
            if (vscodeSetting) {
                const configTest = this.checkWithExistingSettings(vscodeSetting, config);
                const mappedSetting = new MappedSetting(sublimeSetting, vscodeSetting);

                if (configTest.alreadyExists) {
                    analyzedSettings.alreadyExisting.push(mappedSetting);   // setting with same key-value pair already exists
                } else {
                    if (configTest.existingValue) {
                        mappedSetting.vscode.markAsOverride(configTest.existingValue); // setting with same key but different value exists
                    }
                    analyzedSettings.mappedSettings.push(mappedSetting);
                }
            } else {
                analyzedSettings.noMappings.push(sublimeSetting);
            }
        }
        return this.appendDefaultSublimeSettings(analyzedSettings, settings.defaults, config);
    }

    private checkWithExistingSettings(vscodeSetting: VscodeSetting, config: vscode.WorkspaceConfiguration): IConfigCheck {
        const returnVal = { alreadyExists: false, existingValue: '' };
        const info = config.inspect(vscodeSetting.name);
        if (info && info.globalValue !== undefined) {
            if (info.globalValue === vscodeSetting.value) {
                returnVal.alreadyExists = true;
            } else {
                returnVal.existingValue = returnVal.existingValue === null ? '' : String(info.globalValue);
            }
        }
        return returnVal;
    }

    private appendDefaultSublimeSettings(settings: CategorizedSettings, defaultSettings: VscodeSetting[], config: vscode.WorkspaceConfiguration): CategorizedSettings {
        const mappedAndExisting: MappedSetting[] = [...settings.mappedSettings, ...settings.alreadyExisting];
        // filter out default settings that will be imported as mapped settings or already exist in the user settings
        const uniqueDefaultSettings = mappedAndExisting.length
            ? defaultSettings.filter(defaultSetting => !mappedAndExisting.find(mappedSetting => mappedSetting.vscode.name === defaultSetting.name))
            : defaultSettings;

        // don't show settings that already exist in user config
        uniqueDefaultSettings.forEach(defaultSetting => {
            const configTest = this.checkWithExistingSettings(defaultSetting, config);

            if (configTest.alreadyExists) {
                settings.alreadyExisting.push(new MappedSetting({ name: vscode.l10n.t('Default Setting'), value: '' }, defaultSetting));
            } else {
                if (configTest.existingValue) {
                    defaultSetting.markAsOverride(configTest.existingValue);
                }
                settings.defaultSettings.push(defaultSetting);
            }
        });

        settings.defaultSettings.sort((a, b) => {
            if (a.overwritesValue && b.overwritesValue) {
                return a.name.localeCompare(b.name);
            } else if (a.overwritesValue) {
                return 1;
            } else if (b.overwritesValue) {
                return -1;
            }
            return a.name.localeCompare(b.name);
        });

        return settings;
    }

    private mapSetting(sublimeSetting: ISetting, mappedValue: any): VscodeSetting | undefined {
        if (mappedValue !== undefined) {
            if (typeof mappedValue === 'string') {
                return new VscodeSetting(mappedValue, sublimeSetting.value);
            } else if (typeof mappedValue === 'object') {
                const obj = mappedValue[sublimeSetting.value];
                if (!obj) {
                    vscode.window.showErrorMessage(vscode.l10n.t(
                        {
                            message: "Failed to parse setting: '{0}: {1}'. Please check if it contains syntax errors",
                            args: [sublimeSetting.name, sublimeSetting.value],
                            comment: ["{0} is the name of the setting, {1} is the value of the setting"]
                        }
                    ));
                    return undefined;
                }
                const keys = Object.keys(obj);
                const newKey = keys[0];
                const newValue = obj[newKey];
                return new VscodeSetting(newKey, newValue);
            }
        }

        return undefined;
    }
}
