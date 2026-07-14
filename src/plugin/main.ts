import { Plugin } from 'obsidian';
import type { EditorView } from '@codemirror/view';
import { createColorMarkPostProcessor } from '../parser/readingView';
import { createHighlightLivePreviewExtension } from '../parser/livePreview';
import { buildContextMenuHandler } from './contextMenu';
import { registerColorCommands, registerOpenPaletteCommand, registerUnhighlightCommand } from './commands';
import { migrateSettings, type Settings } from '../settings/data';
import { applyHighlightStyle, getColorMap, removeHighlightStyle, type HighlightColorVars } from '../settings/styleInjector';
import { HighlightSettingTab } from '../settings/tab';
import { detectLocale, setLocale } from '../i18n';

interface WorkspaceWithCM {
  iterateCodeMirrors(cb: (view: EditorView) => void): void;
}

export default class NativeHighlightPlugin extends Plugin {
  settings!: Settings;
  registeredColorCommandIds: string[] = [];
  private colorMap: Map<string, HighlightColorVars> = new Map();

  async onload() {
    setLocale(detectLocale());
    await this.loadSettings();
    this.rebuildColorMap();
    applyHighlightStyle(this.settings.style);
    this.registerMarkdownPostProcessor(createColorMarkPostProcessor(() => this.colorMap));
    this.registerEditorExtension(createHighlightLivePreviewExtension(() => this.colorMap));
    this.registerEvent(this.app.workspace.on('editor-menu', buildContextMenuHandler(this)));
    this.addSettingTab(new HighlightSettingTab(this.app, this));
    registerOpenPaletteCommand(this);
    registerUnhighlightCommand(this);
    registerColorCommands(this);
  }

  onunload() {
    removeHighlightStyle();
  }

  async loadSettings() {
    this.settings = migrateSettings((await this.loadData()) as Partial<Settings> | null);
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.rebuildColorMap();
    applyHighlightStyle(this.settings.style);
    registerColorCommands(this);
    this.refreshEditors();
  }

  private rebuildColorMap(): void {
    this.colorMap = getColorMap(this.settings);
  }

  private refreshEditors(): void {
    try {
      // internal API: iterateCodeMirrors — forces ViewPlugin to rebuild decorations
      // so updated color map (bg/underline) takes effect without re-opening the file.
      const ws = this.app.workspace as unknown as WorkspaceWithCM;
      ws.iterateCodeMirrors?.((view: EditorView) => view.dispatch({}));
    } catch {
      /* internal API best-effort */
    }
  }
}
